from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func
from typing import List, Optional
from app.models.feed_comments import FeedComments
from app.models.users import Users
from app.schemas.comments import CommentCreate, CommentUpdate
from datetime import datetime, timezone
import pytz

def get_comment_by_id(db: Session, comment_id: int) -> Optional[FeedComments]:
    """댓글 ID로 댓글 조회 (사용자 정보 포함)"""
    try:
        return db.query(FeedComments).options(
            joinedload(FeedComments.user)
        ).filter(FeedComments.comment_id == comment_id).first()
    except Exception as e:
        print(f"❌ 댓글 조회 오류: {str(e)}")
        return None

def get_comments_by_feed_id(
    db: Session, 
    feed_id: int, 
    skip: int = 0, 
    limit: int = 20,
    include_replies: bool = True
) -> List[FeedComments]:
    """피드의 댓글 목록 조회 (대댓글 포함/제외 선택 가능, 사용자 정보 포함)"""
    try:
        query = db.query(FeedComments).options(
            joinedload(FeedComments.user)
        ).filter(FeedComments.feed_id == feed_id)
        
        if not include_replies:
            # 최상위 댓글만 조회 (parent_id가 None인 것들)
            query = query.filter(FeedComments.parent_id.is_(None))
        
        return query.order_by(FeedComments.created_at.asc()).offset(skip).limit(limit).all()
    except Exception as e:
        print(f"❌ 댓글 목록 조회 오류: {str(e)}")
        return []

def get_top_level_comments(
    db: Session, 
    feed_id: int, 
    skip: int = 0, 
    limit: int = 20
) -> List[FeedComments]:
    """최상위 댓글만 조회 (parent_id가 None인 댓글들, 사용자 정보 포함)"""
    try:
        return db.query(FeedComments).options(
            joinedload(FeedComments.user)
        ).filter(
            and_(
                FeedComments.feed_id == feed_id,
                FeedComments.parent_id.is_(None)
            )
        ).order_by(FeedComments.created_at.asc()).offset(skip).limit(limit).all()
    except Exception as e:
        print(f"❌ 최상위 댓글 조회 오류: {str(e)}")
        return []

def get_replies_by_parent_id(
    db: Session, 
    parent_id: int,
    skip: int = 0,
    limit: int = 50
) -> List[FeedComments]:
    """특정 댓글의 대댓글 목록 조회 (사용자 정보 포함)"""
    try:
        return db.query(FeedComments).options(
            joinedload(FeedComments.user)
        ).filter(
            FeedComments.parent_id == parent_id
        ).order_by(FeedComments.created_at.asc()).offset(skip).limit(limit).all()
    except Exception as e:
        print(f"❌ 대댓글 조회 오류: {str(e)}")
        return []

def count_comments_by_feed_id(db: Session, feed_id: int) -> int:
    """피드의 전체 댓글 수 (대댓글 포함)"""
    try:
        return db.query(FeedComments).filter(FeedComments.feed_id == feed_id).count()
    except Exception as e:
        print(f"❌ 댓글 수 조회 오류: {str(e)}")
        return 0

def count_top_level_comments(db: Session, feed_id: int) -> int:
    """피드의 최상위 댓글 수"""
    try:
        return db.query(FeedComments).filter(
            and_(
                FeedComments.feed_id == feed_id,
                FeedComments.parent_id.is_(None)
            )
        ).count()
    except Exception as e:
        print(f"❌ 최상위 댓글 수 조회 오류: {str(e)}")
        return 0

def count_replies_by_parent_id(db: Session, parent_id: int) -> int:
    """특정 댓글의 대댓글 수"""
    try:
        return db.query(FeedComments).filter(FeedComments.parent_id == parent_id).count()
    except Exception as e:
        print(f"❌ 대댓글 수 조회 오류: {str(e)}")
        return 0

def create_comment(
    db: Session, 
    comment: CommentCreate, 
    user_id: int, 
    feed_id: int
) -> Optional[FeedComments]:
    """댓글 생성"""
    try:
        print(f"💬 댓글 생성 시작: user_id={user_id}, feed_id={feed_id}")
        print(f"📝 댓글 내용: '{comment.content}'")
        print(f"🔗 부모 댓글 ID: {comment.parent_id}")
        
        # 대댓글인 경우 부모 댓글 존재 여부 확인
        parent_id = None  # 기본값을 None으로 설정
        
        if comment.parent_id and comment.parent_id > 0:  # 0보다 큰 값만 처리
            parent_comment = get_comment_by_id(db, comment.parent_id)
            if not parent_comment:
                raise ValueError("부모 댓글을 찾을 수 없습니다.")
            if parent_comment.feed_id != feed_id:
                raise ValueError("부모 댓글이 해당 피드에 속하지 않습니다.")
            parent_id = comment.parent_id  # 유효한 부모 댓글 ID 설정
            print(f"✅ 부모 댓글 확인 완료: {parent_id}")
        
        # 댓글 객체 생성
        korea_tz = pytz.timezone('Asia/Seoul')
        db_comment = FeedComments(
            user_id=user_id,
            feed_id=feed_id,
            parent_id=parent_id,  # None 또는 유효한 부모 댓글 ID
            content=comment.content,
            created_at=datetime.now(korea_tz)
        )
        
        print(f"📦 댓글 객체 생성 완료")
        
        # 데이터베이스에 저장
        db.add(db_comment)
        db.commit()
        db.refresh(db_comment)
        
        print(f"💾 데이터베이스 저장 완료: comment_id={db_comment.comment_id}")
        
        # 사용자 정보를 포함하여 다시 조회
        result = get_comment_by_id(db, db_comment.comment_id)
        print(f"✅ 댓글 생성 완료: {result.comment_id if result else 'None'}")
        
        return result
        
    except ValueError as e:
        print(f"❌ Validation 오류: {str(e)}")
        db.rollback()
        raise e
    except Exception as e:
        print(f"❌ 댓글 생성 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise e

def update_comment(
    db: Session, 
    comment_id: int, 
    comment_update: CommentUpdate,
    user_id: int
) -> Optional[FeedComments]:
    """댓글 수정 (작성자만 가능)"""
    try:
        db_comment = get_comment_by_id(db, comment_id)
        if not db_comment:
            return None
        
        if db_comment.user_id != user_id:
            raise ValueError("댓글을 수정할 권한이 없습니다.")
        
        db_comment.content = comment_update.content
        db.commit()
        db.refresh(db_comment)
        
        # 사용자 정보를 포함하여 다시 조회
        return get_comment_by_id(db, comment_id)
    except Exception as e:
        print(f"❌ 댓글 수정 오류: {str(e)}")
        db.rollback()
        raise e

def delete_comment(db: Session, comment_id: int, user_id: int) -> bool:
    """댓글 삭제 (작성자만 가능, 대댓글도 함께 삭제)"""
    try:
        db_comment = get_comment_by_id(db, comment_id)
        if not db_comment:
            return False
        
        if db_comment.user_id != user_id:
            raise ValueError("댓글을 삭제할 권한이 없습니다.")
        
        # 먼저 모든 대댓글 삭제
        replies = get_replies_by_parent_id(db, comment_id)
        for reply in replies:
            db.delete(reply)
        
        # 부모 댓글 삭제
        db.delete(db_comment)
        db.commit()
        return True
    except Exception as e:
        print(f"❌ 댓글 삭제 오류: {str(e)}")
        db.rollback()
        raise e

def build_comment_tree(comments: List[FeedComments]) -> List[dict]:
    """댓글 목록을 트리 구조로 변환"""
    try:
        comment_dict = {}
        root_comments = []
        
        # 모든 댓글을 딕셔너리로 변환
        for comment in comments:
            comment_data = {
                "comment_id": comment.comment_id,
                "user_id": comment.user_id,
                "feed_id": comment.feed_id,
                "parent_id": comment.parent_id,
                "content": comment.content,
                "created_at": comment.created_at.isoformat() if hasattr(comment.created_at, 'isoformat') else str(comment.created_at),
                "user": {
                    "user_id": comment.user.user_id,
                    "nickname": comment.user.nickname,
                    "profile_picture": comment.user.profile_picture
                } if comment.user else {
                    "user_id": comment.user_id,
                    "nickname": "알 수 없는 사용자",
                    "profile_picture": None
                },
                "replies": [],
                "reply_count": 0
            }
            comment_dict[comment.comment_id] = comment_data
        
        # 트리 구조 구성
        for comment in comments:
            comment_data = comment_dict[comment.comment_id]
            
            if comment.parent_id is None:
                # 최상위 댓글
                root_comments.append(comment_data)
            else:
                # 대댓글
                parent = comment_dict.get(comment.parent_id)
                if parent:
                    parent["replies"].append(comment_data)
                    parent["reply_count"] += 1
        
        return root_comments
    except Exception as e:
        print(f"❌ 댓글 트리 구성 오류: {str(e)}")
        return []

def get_comment_tree_by_feed_id(
    db: Session, 
    feed_id: int, 
    skip: int = 0, 
    limit: int = 20
) -> tuple[List[dict], int]:
    """피드의 댓글을 트리 구조로 조회"""
    try:
        # 최상위 댓글 조회
        top_comments = get_top_level_comments(db, feed_id, skip, limit)
        total_top_comments = count_top_level_comments(db, feed_id)
        
        if not top_comments:
            return [], total_top_comments
        
        # 각 최상위 댓글의 대댓글들도 조회
        all_comments = []
        for top_comment in top_comments:
            all_comments.append(top_comment)
            replies = get_replies_by_parent_id(db, top_comment.comment_id)
            all_comments.extend(replies)
        
        # 트리 구조로 변환
        comment_tree = build_comment_tree(all_comments)
        
        return comment_tree, total_top_comments
    except Exception as e:
        print(f"❌ 댓글 트리 조회 오류: {str(e)}")
        return [], 0
