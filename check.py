import sqlite3; conn = sqlite3.connect('mindbot.db'); cursor = conn.cursor(); cursor.execute('SELECT id, username, is_admin FROM users WHERE username="admin"'); print(cursor.fetchone())
