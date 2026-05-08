import kagglehub
import pymongo
import pandas as pd
import math
import os

print("Downloading dataset...")
path = kagglehub.dataset_download("thedevastator/better-recipes-for-a-better-life")

csv_file = None
for f in os.listdir(path):
    if f.endswith('.csv'):
        csv_file = os.path.join(path, f)
        break

if not csv_file:
    print("No CSV found")
    exit(1)

df = pd.read_csv(csv_file)

print("Connecting to MongoDB...")
client = pymongo.MongoClient("mongodb://localhost:27017")
db = client['demo-db']
col = db['recipes']

print("Dropping old collection if exists...")
col.drop()

print("Processing data...")
records = df.head(50).to_dict('records')
docs = []
for r in records:
    clean_r = {k: (v if not (isinstance(v, float) and math.isnan(v)) else None) for k, v in r.items()}
    
    doc = {
        'recipe_name': clean_r.get('recipe_name', 'Unknown'),
        'prep_time': clean_r.get('prep_time', ''),
        'cook_time': clean_r.get('cook_time', ''),
        'total_time': clean_r.get('total_time', ''),
        'servings': clean_r.get('servings', '')
    }
    docs.append(doc)

col.insert_many(docs)
print("Data successfully seeded to MongoDB (demo-db -> recipes)!")
