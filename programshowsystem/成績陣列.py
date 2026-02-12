"""
星形圖案繪製程式
功能：使用1-15範圍內的數字，在星形的每個角顯示3的倍數（3, 6, 9, 12, 15）
"""

import turtle  # 導入turtle繪圖模組
import math    # 導入數學模組，用於計算角度和座標


def get_star_points(num_points, radius, inner_radius):
    """
    計算星形所有頂點的座標位置
    
    參數:
        num_points: 星形的角數
        radius: 外圓半徑
        inner_radius: 內圓半徑
    
    返回:
        points: 包含所有頂點座標的列表（外點和內點交替）
    """
    points = []                          # 儲存所有頂點座標的列表
    angle_step = 360 / num_points        # 每個角之間的角度間隔
    start_angle = -90                    # 起始角度（-90度表示從頂部開始）
    
    # 星形需要外點和內點交替連接，所以總共需要 num_points * 2 個點
    for i in range(num_points * 2):
        if i % 2 == 0:
            # 外點（星形的外角）
            angle = math.radians(start_angle + i * angle_step / 2)
            x = radius * math.cos(angle)      # 計算x座標
            y = radius * math.sin(angle)      # 計算y座標
            points.append((x, y))
        else:
            # 內點（星形的內角）
            angle = math.radians(start_angle + i * angle_step / 2)
            x = inner_radius * math.cos(angle)  # 計算x座標
            y = inner_radius * math.sin(angle)  # 計算y座標
            points.append((x, y))
    
    return points


def get_outer_points(num_points, radius):
    """
    獲取星形外角的座標位置（只用於顯示數字）
    
    參數:
        num_points: 星形的角數
        radius: 外圓半徑
    
    返回:
        points: 包含所有外角座標的列表
    """
    points = []                          # 儲存外角座標的列表
    angle_step = 360 / num_points        # 每個角之間的角度間隔
    start_angle = -90                    # 起始角度（從頂部開始）
    
    # 只計算外角的位置（共 num_points 個點）
    for i in range(num_points):
        angle = math.radians(start_angle + i * angle_step)  # 將角度轉換為弧度
        x = radius * math.cos(angle)     # 使用三角函數計算x座標
        y = radius * math.sin(angle)     # 使用三角函數計算y座標
        points.append((x, y))
    
    return points


def main():
    """主函數：執行星形圖案的繪製"""
    try:
        # ========== 初始化畫布 ==========
        screen = turtle.Screen()        # 創建畫布視窗
        screen.bgcolor("white")         # 設置背景顏色為白色
        screen.title("星形圖案 - 3的倍數")  # 設置視窗標題
        
        # ========== 創建繪圖筆 ==========
        pen = turtle.Turtle()          # 創建turtle物件（繪圖筆）
        pen.speed(3)                    # 設置繪圖速度（1-10，3為中等速度）
        pen.color("blue")              # 設置線條顏色為藍色
        
        # ========== 定義數據 ==========
        # 在1-15範圍內，3的倍數有：3, 6, 9, 12, 15（共5個數字）
        multiples_of_3 = [3, 6, 9, 12, 15]
        
        # ========== 星形參數設置 ==========
        num_points = 5      # 星形的角數（五角星）
        radius = 150        # 外圓半徑（星形外角的距離）
        inner_radius = 60   # 內圓半徑（星形內角的距離）
        
        # ========== 繪製星形 ==========
        # 獲取星形所有頂點的座標
        points = get_star_points(num_points, radius, inner_radius)
        
        # 移動到第一個點（不畫線）
        pen.penup()
        pen.goto(points[0])
        pen.pendown()  # 放下筆，開始畫線
        
        # 依次連接到所有點，形成星形
        for point in points[1:]:
            pen.goto(point)
        
        # 連接回起點，完成星形
        pen.goto(points[0])
        
        # ========== 在每個外角顯示3的倍數 ==========
        # 獲取所有外角的座標位置
        outer_points = get_outer_points(num_points, radius)
        
        # 設置文字顯示的樣式
        pen.penup()        # 抬起筆，移動時不畫線
        pen.color("red")   # 設置文字顏色為紅色
        pen.pensize(2)     # 設置筆的粗細（雖然不畫線，但保持設置）
        
        # 在每個外角位置顯示對應的3的倍數
        for i, (x, y) in enumerate(outer_points):
            # 計算數字顯示的位置（在角的外側，稍微遠離頂點）
            offset = 30                    # 距離頂點的偏移量
            angle = math.atan2(y, x)       # 計算從原點到該點的角度
            text_x = x + offset * math.cos(angle)  # 計算文字的x座標
            text_y = y + offset * math.sin(angle)  # 計算文字的y座標
            
            # 移動到文字位置（稍微向下調整以居中顯示）
            pen.goto(text_x, text_y - 10)
            # 寫入對應的3的倍數
            pen.write(str(multiples_of_3[i]), align="center", font=("Arial", 16, "bold"))
        
        # ========== 完成繪圖 ==========
        pen.hideturtle()      # 隱藏turtle游標
        
        # 保持視窗打開，點擊視窗後關閉
        print("星形圖案繪製完成！點擊視窗關閉。")
        screen.exitonclick()
        
    except Exception as e:
        print(f"發生錯誤：{e}")
        print("請確保已正確安裝Python和turtle模組。")
        input("按Enter鍵退出...")


# 如果直接運行此腳本，則執行main函數
if __name__ == "__main__":
    main()
