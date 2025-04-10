import pandas as pd
import os
import json
import glob
from datetime import datetime
import sys

# Path settings
csv_file = "tasks.csv"
tasks_dir = "tasks"
csv_raw_dir = "csv/raw"
csv_cleaned_dir = "csv/cleaned"
backup_dir = "backup"

# 열 이름 정의 (헤더 없음 가정)
CSV_COLUMNS = ['id', 'username', 'mainCategory', 'subCategory', 'startTime', 'elapsedTime', 'endTime', 'quantity', 'note']

def clean_csv():
    try:
        if not os.path.exists(csv_file):
            print("⚠️ CSV file not found.")
            return

        # CSV 읽기 (헤더 없음, 열 이름 지정)
        df = pd.read_csv(csv_file, header=None, names=CSV_COLUMNS, on_bad_lines='warn')
        if df.empty:
            print("⚠️ CSV is empty.")
            return

        # 백업
        date_str = datetime.now().strftime('%Y-%m-%d')
        os.makedirs(backup_dir, exist_ok=True)
        backup_file = os.path.join(backup_dir, f"tasks_{date_str}.csv")
        df.to_csv(backup_file, index=False)
        print(f"✅ CSV backup saved: {backup_file}")

        # 날짜별 분리
        os.makedirs(csv_raw_dir, exist_ok=True)
        os.makedirs(csv_cleaned_dir, exist_ok=True)
        
        # endTime으로 날짜 추출
        df['date'] = pd.to_datetime(df['endTime'], errors='coerce').dt.date
        if df['date'].isna().all():
            print("⚠️ All endTime values are invalid. Using current date as fallback.")
            df['date'] = datetime.now().date()

        for date, group in df.groupby('date'):
            if pd.isna(date):
                print(f"⚠️ Skipping invalid date group")
                continue
            
            # Raw 버전
            raw_file = os.path.join(csv_raw_dir, f"tasks_{date}.csv")
            if os.path.exists(raw_file):
                existing_raw_df = pd.read_csv(raw_file, header=None, names=CSV_COLUMNS, on_bad_lines='warn')
                combined_raw_df = pd.concat([existing_raw_df, group.drop(columns=['date'])])
            else:
                combined_raw_df = group.drop(columns=['date'])
            combined_raw_df.to_csv(raw_file, index=False, header=False)  # 헤더 없이 저장
            print(f"✅ Raw CSV saved for {date}: {raw_file}")

            # Cleaned 버전
            cleaned_file = os.path.join(csv_cleaned_dir, f"tasks_{date}.csv")
            cleaned_df = group.drop_duplicates(subset=['id'], keep='last')
            if os.path.exists(cleaned_file):
                existing_cleaned_df = pd.read_csv(cleaned_file, header=None, names=CSV_COLUMNS, on_bad_lines='warn')
                combined_cleaned_df = pd.concat([existing_cleaned_df, cleaned_df.drop(columns=['date'])])
                combined_cleaned_df = combined_cleaned_df.drop_duplicates(subset=['id'], keep='last')
            else:
                combined_cleaned_df = cleaned_df.drop(columns=['date'])
            combined_cleaned_df.to_csv(cleaned_file, index=False, header=False)  # 헤더 없이 저장
            print(f"✅ Cleaned CSV saved for {date}: {cleaned_file}")

    except Exception as e:
        print(f"❌ Error cleaning CSV: {e}")
    finally:
        try:
            with open(csv_file, 'w') as f:
                f.truncate(0)
            print(f"✅ CSV cleared: {csv_file}")
        except Exception as e:
            print(f"❌ Error clearing tasks.csv: {e}")

def clean_json():
    try:
        json_files = glob.glob(os.path.join(tasks_dir, "*.json"))
        if not json_files:
            print("⚠️ No JSON files found.")
            return

        for json_file in json_files:
            print(f"🔍 Processing JSON file: {json_file}")
            with open(json_file, 'r', encoding='utf8') as f:
                tasks = json.load(f)
            print(f"📋 Original tasks count: {len(tasks)}")

            cleaned_tasks = [task for task in tasks if task.get('status', 'pending') != 'completed']
            print(f"📋 Cleaned tasks count: {len(cleaned_tasks)}")

            with open(json_file, 'w', encoding='utf8') as f:
                json.dump(cleaned_tasks, f, indent=2)
            print(f"✅ JSON cleaned: {json_file} (remaining tasks: {len(cleaned_tasks)})")
    except Exception as e:
        print(f"❌ Error cleaning JSON: {e}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python clean_tracker.py [csv|json|all]")
        print("  - csv: Clean only CSV")
        print("  - json: Clean only JSON")
        print("  - all: Clean both CSV and JSON")
        return

    mode = sys.argv[1].lower()
    print(f"🔍 Starting tracker cleanup: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    if mode == 'csv':
        clean_csv()
    elif mode == 'json':
        clean_json()
    elif mode == 'all':
        clean_csv()
        clean_json()
    else:
        print(f"❌ Invalid mode: {mode}. Use 'csv', 'json', or 'all'.")
        return

    print("✅ Cleanup completed!")

if __name__ == "__main__":
    main()