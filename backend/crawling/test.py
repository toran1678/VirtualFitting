import pandas as pd
import pymysql

# CSV 파일 읽기
df = pd.read_csv('C:/Users/leekh/OneDrive/바탕 화면/작업중/통합 (상의,바지,원피스_스커트,아우터 일부분).csv', encoding='utf-8-sig')
df = df.where(pd.notnull(df), None)

# DB 연결
conn = pymysql.connect(
    host='localhost',
    user='root',
    password='123456',
    db='capstone',
    charset='utf8mb4',
    autocommit=True
)

cursor = conn.cursor()

insert_query = """
INSERT INTO clothing_item (product, product_link, image_link, brand, likes, gender, main_category, sub_category)
VALUES (%s, %s, %s, %s, %s, %s,%s, %s)
"""

cursor.executemany(insert_query, df.values.tolist())
cursor.close()
conn.close()

print("✅ PyMySQL로 DB 삽입 완료")