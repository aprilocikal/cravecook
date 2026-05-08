import json
import pymongo

print("Reading recipes.json...")
with open('recipes.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("Connecting to MongoDB...")
client = pymongo.MongoClient("mongodb://localhost:27017")
db = client['demo-db']
col = db['recipes']

print("Dropping old collection...")
col.drop()

print(f"Inserting {len(data)} records into MongoDB...")
col.insert_many(data)

print("Import completed successfully!")
