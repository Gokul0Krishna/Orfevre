from lib.firestore import db
collections = [c.id for c in db.collections()]
print(f"Collections: {collections}")
for col in collections:
    docs = list(db.collection(col).limit(5).stream())
    print(f"Collection {col} has {len(docs)} docs (sampled)")
    for d in docs:
        print(f"  Doc {d.id}: {d.to_dict()}")
