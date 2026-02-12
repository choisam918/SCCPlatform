# 範例 Python 檔案 1
# 這是一個簡單的 Hello World 程式

def hello_world():
    """印出 Hello World"""
    print("Hello, World!")
    return "Hello, World!"

def greet(name):
    """向指定的人打招呼"""
    message = f"Hello, {name}!"
    print(message)
    return message

if __name__ == "__main__":
    hello_world()
    greet("Python")
