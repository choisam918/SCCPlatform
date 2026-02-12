# 範例 Python 檔案 2
# 這是一個簡單的計算器類別

class Calculator:
    """簡單的計算器類別"""
    
    def __init__(self):
        self.result = 0
    
    def add(self, x, y):
        """加法運算"""
        self.result = x + y
        return self.result
    
    def subtract(self, x, y):
        """減法運算"""
        self.result = x - y
        return self.result
    
    def multiply(self, x, y):
        """乘法運算"""
        self.result = x * y
        return self.result
    
    def divide(self, x, y):
        """除法運算"""
        if y == 0:
            raise ValueError("除數不能為零")
        self.result = x / y
        return self.result

# 使用範例
if __name__ == "__main__":
    calc = Calculator()
    print(calc.add(10, 5))
    print(calc.multiply(3, 4))
