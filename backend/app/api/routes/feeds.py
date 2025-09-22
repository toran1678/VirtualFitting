from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
from datetime import datetime

from app.db.database import get_db
from app.models.users import Users
from app.models.feeds import Feeds
from app.models.feed_images import FeedImages
from app.schemas.feeds import FeedCreate, FeedResponse, FeedListResponse
from app.api.dependencies import get_current_user
from app.utils.file_upload import save_upload_file

router = APIRouter(
    prefix="/api/feeds",
    tags=["feeds"]
)

def get_feed_with_user_status(feed, current_user_id, db):
    """피드 정보에 현재 사용자의 상태 정보를 추가하는 헬퍼 함수"""
    user = db.query(Users).filter(Users.user_id == feed.user_id).first()
    images = db.query(FeedImages).filter(FeedImages.feed_id == feed.feed_id).order_by(FeedImages.image_order).all()
    
    # 기본값 설정
    like_count = 0
    comment_count = 0
    is_liked = False
    is_following = False
    
    # 좋아요 수와 현재 사용자의 좋아요 상태 확인
    try:
        from app.models.liked_feeds import LikedFeeds
        
        # 전체 좋아요 수 계산
        like_count = db.query(LikedFeeds).filter(LikedFeeds.feed_id == feed.feed_id).count()
        
        # 현재 사용자의 좋아요 상태 확인 (로그인한 경우에만)
        if current_user_id:
            user_like = db.query(LikedFeeds).filter(
                LikedFeeds.feed_id == feed.feed_id,
                LikedFeeds.user_id == current_user_id
            ).first()
            is_liked = user_like is not None
            
    except ImportError:
        pass
    except Exception:
        pass
    
    # 댓글 수 계산
    try:
        from app.models.feed_comments import FeedComments
        comment_count = db.query(FeedComments).filter(FeedComments.feed_id == feed.feed_id).count()
    except ImportError:
        pass
    except Exception:
        pass
    
    # 팔로우 상태 확인
    if current_user_id and user and current_user_id != user.user_id:
        try:
            from app.models.users import Followers
            follow_record = db.query(Followers).filter(
                Followers.follower_id == current_user_id,
                Followers.following_id == user.user_id
            ).first()
            is_following = follow_record is not None
        except ImportError:
            # Followers 모델이 없는 경우
            try:
                from app.crud.followers import is_following as check_following
                is_following = check_following(db, current_user_id, user.user_id)
            except ImportError:
                pass
        except Exception:
            pass
    
    result = {
        "feed_id": feed.feed_id,
        "user_id": feed.user_id,
        "title": feed.title,
        "content": feed.content,
        "created_at": feed.created_at,
        "updated_at": feed.updated_at,
        "user": {
            "user_id": user.user_id,
            "nickname": user.nickname,
            "email": user.email,  # 이메일 정보 추가
            "profile_picture": user.profile_picture,
            "isFollowing": is_following  # 팔로우 상태 추가
        } if user else None,
        "images": [
            {
                "id": img.id,
                "image_url": img.image_url,
                "image_order": img.image_order
            }
            for img in images
        ],
        "like_count": like_count,
        "comment_count": comment_count,
        "is_liked": is_liked
    }
    
    return result

# 피드 작성
@router.post("/", response_model=FeedResponse)
async def create_feed(
    title: str = Form(...),
    content: str = Form(...),
    images: List[UploadFile] = File(None),
    image_orders: List[int] = Form(None),
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """피드 작성 API"""
    try:
        # 피드 생성
        new_feed = Feeds(
            user_id=current_user.user_id,
            title=title,
            content=content,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        db.add(new_feed)
        db.flush()
        
        # 이미지 처리
        if images and image_orders:
            for i, image_file in enumerate(images):
                file_ext = os.path.splitext(image_file.filename)[1]
                unique_filename = f"{uuid.uuid4()}{file_ext}"
                upload_dir = os.path.join("uploads", "feeds")
                os.makedirs(upload_dir, exist_ok=True)
                file_path = os.path.join(upload_dir, unique_filename)
                
                await save_upload_file(image_file, file_path)
                
                image_url = f"/uploads/feeds/{unique_filename}"
                
                feed_image = FeedImages(
                    feed_id=new_feed.feed_id,
                    image_url=image_url,
                    image_order=image_orders[i] if i < len(image_orders) else i + 1,
                    created_at=datetime.now()
                )
                db.add(feed_image)
        
        db.commit()
        db.refresh(new_feed)
        
        response_data = get_feed_with_user_status(new_feed, current_user.user_id, db)
        return response_data
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"피드 작성 중 오류가 발생했습니다: {str(e)}"
        )

# 피드 목록 조회
@router.get("/", response_model=FeedListResponse)
async def get_feeds(
    page: int = 1,
    size: int = 10,
    sort_by: str = "created_at",
    order: str = "desc",
    db: Session = Depends(get_db),
    request: Request = None
):
    """피드 목록 조회 API"""
    try:
        # 현재 사용자 확인
        current_user_id = None
        try:
            if request and hasattr(request, 'session') and 'user_id' in request.session:
                user_id = request.session['user_id']
                current_user = db.query(Users).filter(Users.user_id == user_id).first()
                if current_user:
                    current_user_id = current_user.user_id
        except Exception:
            pass
        
        # 페이지네이션 설정
        skip = (page - 1) * size
        
        # 정렬 설정
        order_by = getattr(Feeds, sort_by, Feeds.created_at)
        if order.lower() == "desc":
            order_by = order_by.desc()
        else:
            order_by = order_by.asc()
        
        # 피드 목록 조회
        feeds = db.query(Feeds).order_by(order_by).offset(skip).limit(size).all()
        total = db.query(Feeds).count()
        
        # 응답 데이터 준비
        feed_list = []
        for feed in feeds:
            feed_data = get_feed_with_user_status(feed, current_user_id, db)
            feed_list.append(feed_data)
        
        return {
            "feeds": feed_list,
            "total": total,
            "page": page,
            "size": size,
            "total_pages": (total + size - 1) // size
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"피드 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )
        
# 내가 작성한 피드 목록 조회
@router.get("/my-feeds", response_model=FeedListResponse)
async def get_my_feeds(
    page: int = 1,
    size: int = 10,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """내가 작성한 피드 목록 조회 API"""
    try:
        skip = (page - 1) * size
        
        feeds = db.query(Feeds).filter(
            Feeds.user_id == current_user.user_id
        ).order_by(Feeds.created_at.desc()).offset(skip).limit(size).all()
        
        total = db.query(Feeds).filter(Feeds.user_id == current_user.user_id).count()
        
        feed_list = []
        for feed in feeds:
            feed_data = get_feed_with_user_status(feed, current_user.user_id, db)
            feed_list.append(feed_data)
        
        return {
            "feeds": feed_list,
            "total": total,
            "page": page,
            "size": size,
            "total_pages": (total + size - 1) // size
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"내 피드 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )
        
# 피드 검색
@router.get("/search", response_model=FeedListResponse)
async def search_feeds(
    q: str,
    page: int = 1,
    size: int = 10,
    db: Session = Depends(get_db),
    request: Request = None
):
    """피드 검색 API"""
    try:
        skip = (page - 1) * size
        
        # 제목이나 내용에서 검색
        feeds = db.query(Feeds).filter(
            (Feeds.title.contains(q)) | (Feeds.content.contains(q))
        ).order_by(Feeds.created_at.desc()).offset(skip).limit(size).all()
        
        total = db.query(Feeds).filter(
            (Feeds.title.contains(q)) | (Feeds.content.contains(q))
        ).count()
        
        # 현재 사용자 확인
        current_user_id = None
        try:
            if request and hasattr(request, 'session') and 'user_id' in request.session:
                current_user_id = request.session['user_id']
        except Exception:
            pass
        
        feed_list = []
        for feed in feeds:
            feed_data = get_feed_with_user_status(feed, current_user_id, db)
            feed_list.append(feed_data)
        
        return {
            "feeds": feed_list,
            "total": total,
            "page": page,
            "size": size,
            "total_pages": (total + size - 1) // size
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"피드 검색 중 오류가 발생했습니다: {str(e)}"
        )

# 특정 피드 조회
@router.get("/{feed_id}", response_model=FeedResponse)
async def get_feed(
    feed_id: int,
    db: Session = Depends(get_db),
    request: Request = None
):
    """특정 피드 조회 API"""
    try:
        feed = db.query(Feeds).filter(Feeds.feed_id == feed_id).first()
        if not feed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="피드를 찾을 수 없습니다."
            )
        
        # 현재 사용자 확인
        current_user_id = None
        try:
            if request and hasattr(request, 'session') and 'user_id' in request.session:
                current_user_id = request.session['user_id']
        except Exception:
            pass
        
        response_data = get_feed_with_user_status(feed, current_user_id, db)
        return response_data
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"피드 조회 중 오류가 발생했습니다: {str(e)}"
        )

# 피드 수정
@router.put("/{feed_id}", response_model=FeedResponse)
async def update_feed(
    feed_id: int,
    title: str = Form(...),
    content: str = Form(...),
    images: List[UploadFile] = File(None),
    image_orders: List[int] = Form(None),
    existing_image_ids: str = Form(None),  # 유지할 기존 이미지 ID들 (쉼표로 구분)
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """피드 수정 API"""
    try:
        # 피드 존재 확인 및 권한 확인
        feed = db.query(Feeds).filter(Feeds.feed_id == feed_id).first()
        if not feed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="피드를 찾을 수 없습니다."
            )
        
        if feed.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="피드를 수정할 권한이 없습니다."
            )
        
        # 피드 정보 업데이트
        feed.title = title
        feed.content = content
        feed.updated_at = datetime.now()
        
        # 이미지 처리 로직 개선
        # 1. 유지할 기존 이미지 ID 파싱
        keep_image_ids = []
        if existing_image_ids:
            try:
                keep_image_ids = [int(id.strip()) for id in existing_image_ids.split(',') if id.strip()]
            except ValueError:
                keep_image_ids = []
        
        # 2. 기존 이미지 중 삭제할 이미지들 제거
        existing_images = db.query(FeedImages).filter(FeedImages.feed_id == feed_id).all()
        for img in existing_images:
            if img.id not in keep_image_ids:
                try:
                    file_path = img.image_url.replace("/uploads/", "uploads/")
                    if os.path.exists(file_path):
                        os.remove(file_path)
                except Exception:
                    pass
                db.delete(img)
        
        # 3. 유지할 기존 이미지들의 순서 업데이트
        if keep_image_ids:
            for i, image_id in enumerate(keep_image_ids):
                existing_img = db.query(FeedImages).filter(
                    FeedImages.id == image_id,
                    FeedImages.feed_id == feed_id
                ).first()
                if existing_img:
                    existing_img.image_order = i + 1
        
        # 4. 새 이미지 저장
        if images:
            start_order = len(keep_image_ids) + 1
            for i, image_file in enumerate(images):
                file_ext = os.path.splitext(image_file.filename)[1]
                unique_filename = f"{uuid.uuid4()}{file_ext}"
                upload_dir = os.path.join("uploads", "feeds")
                os.makedirs(upload_dir, exist_ok=True)
                file_path = os.path.join(upload_dir, unique_filename)
                
                await save_upload_file(image_file, file_path)
                
                image_url = f"/uploads/feeds/{unique_filename}"
                
                feed_image = FeedImages(
                    feed_id=feed_id,
                    image_url=image_url,
                    image_order=image_orders[i] if image_orders and i < len(image_orders) else start_order + i,
                    created_at=datetime.now()
                )
                db.add(feed_image)
        
        db.commit()
        db.refresh(feed)
        
        response_data = get_feed_with_user_status(feed, current_user.user_id, db)
        return response_data
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"피드 수정 중 오류가 발생했습니다: {str(e)}"
        )

# 피드 삭제
@router.delete("/{feed_id}")
async def delete_feed(
    feed_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """피드 삭제 API"""
    try:
        # 피드 존재 확인 및 권한 확인
        feed = db.query(Feeds).filter(Feeds.feed_id == feed_id).first()
        if not feed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="피드를 찾을 수 없습니다."
            )
        
        if feed.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="피드를 삭제할 권한이 없습니다."
            )
        
        # 관련 이미지 파일 삭제
        images = db.query(FeedImages).filter(FeedImages.feed_id == feed_id).all()
        for img in images:
            try:
                file_path = img.image_url.replace("/uploads/", "uploads/")
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception:
                pass
        
        # 피드 삭제
        db.delete(feed)
        db.commit()
        
        return {"message": "피드가 성공적으로 삭제되었습니다."}
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"피드 삭제 중 오류가 발생했습니다: {str(e)}"
        )

# 피드 좋아요 토글
@router.post("/{feed_id}/like")
async def toggle_feed_like(
    feed_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """피드 좋아요 토글 API"""
    try:
        from app.models.liked_feeds import LikedFeeds
        
        # 피드 존재 확인
        feed = db.query(Feeds).filter(Feeds.feed_id == feed_id).first()
        if not feed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="피드를 찾을 수 없습니다."
            )
        
        # 좋아요 여부 확인
        liked = db.query(LikedFeeds).filter(
            LikedFeeds.feed_id == feed_id,
            LikedFeeds.user_id == current_user.user_id
        ).first()
        
        if liked:
            # 좋아요 취소
            db.delete(liked)
            db.commit()
            is_liked = False
            message = "좋아요를 취소했습니다."
        else:
            # 좋아요 추가
            new_like = LikedFeeds(
                feed_id=feed_id,
                user_id=current_user.user_id,
                liked_at=datetime.now()
            )
            db.add(new_like)
            db.commit()
            is_liked = True
            message = "좋아요를 추가했습니다."
        
        # 좋아요 수 조회
        like_count = db.query(LikedFeeds).filter(LikedFeeds.feed_id == feed_id).count()
        
        return {
            "is_liked": is_liked,
            "like_count": like_count,
            "message": message
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"좋아요 처리 중 오류가 발생했습니다: {str(e)}"
        )

# 피드 댓글 작성
@router.post("/{feed_id}/comments")
async def create_feed_comment(
    feed_id: int,
    content: str = Form(...),
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """피드 댓글 작성 API"""
    try:
        from app.models.feed_comments import FeedComments
        
        # 피드 존재 확인
        feed = db.query(Feeds).filter(Feeds.feed_id == feed_id).first()
        if not feed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="피드를 찾을 수 없습니다."
            )
        
        # 댓글 작성
        new_comment = FeedComments(
            feed_id=feed_id,
            user_id=current_user.user_id,
            content=content,
            created_at=datetime.now()
        )
        db.add(new_comment)
        db.commit()
        db.refresh(new_comment)
        
        return {
            "comment_id": new_comment.comment_id,
            "feed_id": new_comment.feed_id,
            "user_id": new_comment.user_id,
            "content": new_comment.content,
            "created_at": new_comment.created_at,
            "user": {
                "user_id": current_user.user_id,
                "nickname": current_user.nickname,
                "profile_picture": current_user.profile_picture
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"댓글 작성 중 오류가 발생했습니다: {str(e)}"
        )
