import kagglehub
import pymongo
import pandas as pd
import math
import os

print("Downloading dataset...")
path = kagglehub.dataset_download("thedevastator/better-recipes-for-a-better-life")
print("Path to dataset files:", path)

# Find the csv file
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
col = db['products']

print("Processing data...")
records = df.head(50).to_dict('records')
for r in records:
    name = r.get('Recipe Name', r.get('RecipeName', r.get('name', 'Unknown Recipe')))
    clean_r = {k: (v if not (isinstance(v, float) and math.isnan(v)) else None) for k, v in r.items()}
    
    doc = {
        'name': str(clean_r.get('Recipe Name', clean_r.get('RecipeName', 'Unknown'))),
        'price': 15000, 
        'details': clean_r
    }
    col.insert_one(doc)

print("Data successfully seeded to MongoDB (demo-db -> products)!")
