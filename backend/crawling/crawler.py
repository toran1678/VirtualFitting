import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from app.models.clothing_items import ClothingItems
from app.db.database import SessionLocal

# 실행 안 되는 코드임 예시로 작성한 것
def fetch_musinsa_items() -> list[dict]:
    url = "https://store.musinsa.com/category/001"
    res = requests.get(url)
    soup = BeautifulSoup(res.text, "html.parser")

    items = []
    for li in soup.select("li.li_box"):  # 무신사 상품 리스트 셀렉터
        name = li.select_one("a.name").text.strip()
        image_url = li.select_one("img")["data-original"]
        category = "상의"
        subcategory = "맨투맨"

        image_data = requests.get(image_url).content

        items.append({
            "name": name,
            "category": category,
            "subCategory": subcategory,
            "image": image_data
        })
    return items

def save_items_to_db(items: list[dict]):
    db: Session = SessionLocal()
    for item in items:
        db_item = ClothingItems(**item)
        db.add(db_item)
    db.commit()
    db.close()