from app.db.database import engine
from app.models.users import Users
from app.models.my_rooms import MyRoom
from app.models.clothing_items import ClothingItems
from app.models.feeds import Feeds
from app.models.feed_comments import FeedComments
from app.models.virtual_fittings import VirtualFittings
from app.models.custom_clothing_items import CustomClothingItems
from app.models.good_wish_lists import GoodWishLists
from app.models.verification import EmailVerification

# 테이블 생성
def create_tables():
    ClothingItems.__table__.drop(engine, checkfirst=True)
    FeedComments.__table__.drop(engine, checkfirst=True)
    VirtualFittings.__table__.drop(engine, checkfirst=True)
    CustomClothingItems.__table__.drop(engine, checkfirst=True)
    GoodWishLists.__table__.drop(engine, checkfirst=True)
    EmailVerification.__table__.drop(engine, checkfirst=True)
    MyRoom.__table__.drop(engine, checkfirst=True)
    Feeds.__table__.drop(engine, checkfirst=True)
    Users.__table__.drop(engine, checkfirst=True)
    print("테이블이 삭제되었습니다.")
    
    Users.__table__.create(engine, checkfirst=True)
    MyRoom.__table__.create(engine, checkfirst=True)
    ClothingItems.__table__.create(engine, checkfirst=True)
    Feeds.__table__.create(engine, checkfirst=True)
    FeedComments.__table__.create(engine, checkfirst=True)
    VirtualFittings.__table__.create(engine, checkfirst=True)
    CustomClothingItems.__table__.create(engine, checkfirst=True)
    GoodWishLists.__table__.create(engine, checkfirst=True)
    EmailVerification.__table__.create(engine, checkfirst=True)
    print("테이블이 생성되었습니다.")