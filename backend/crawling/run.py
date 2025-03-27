# from app.crawling.crawler import fetch_musinsa_items, save_items_to_db
from .crawler import fetch_musinsa_items, save_items_to_db

if __name__ == "__main__":
    items = fetch_musinsa_items()
    print(f"크롤링 완료: {len(items)}개 항목")
    save_items_to_db(items)
    print("DB 저장 완료!")