#!/usr/bin/env python3
"""
创建腾讯云SCF部署包的Python脚本
比shell脚本更可靠，特别是在不同操作系统上
"""
import os
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

def create_package():
    """创建SCF部署包"""
    # 获取脚本所在目录
    backend_dir = Path(__file__).parent.absolute()
    os.chdir(backend_dir)
    
    print("=" * 50)
    print("开始创建腾讯云SCF部署包...")
    print("=" * 50)
    print(f"工作目录: {backend_dir}")
    
    # 创建临时打包目录
    package_dir = backend_dir / "scf_package"
    print(f"\n1. 创建临时打包目录: {package_dir}")
    if package_dir.exists():
        shutil.rmtree(package_dir)
    package_dir.mkdir()
    
    # 复制源代码文件
    print("\n2. 复制源代码文件...")
    source_files = ["main.py", "scf_handler.py", "requirements.txt"]
    for file in source_files:
        src = backend_dir / file
        if src.exists():
            shutil.copy2(src, package_dir / file)
            print(f"   ✓ {file}")
        else:
            print(f"   ✗ {file} 不存在，跳过")
            sys.exit(1)
    
    # 安装依赖
    print("\n3. 安装Python依赖到打包目录...")
    os.chdir(package_dir)
    
    # 首先尝试安装完整依赖
    pip_cmd = "pip3" if shutil.which("pip3") else "pip"
    try:
        result = subprocess.run(
            [pip_cmd, "install", "-r", "requirements.txt", "-t", ".", "--quiet"],
            capture_output=True,
            text=True,
            timeout=300
        )
        if result.returncode == 0:
            print("   ✓ 依赖安装成功")
        else:
            print(f"   ⚠ 依赖安装可能有警告: {result.stderr[:200]}")
    except subprocess.TimeoutExpired:
        print("   ✗ 依赖安装超时")
        sys.exit(1)
    except Exception as e:
        print(f"   ✗ 依赖安装失败: {e}")
        sys.exit(1)
    
    # 清理不必要的文件
    print("\n4. 清理不必要的文件...")
    cleanup_patterns = [
        "**/__pycache__",
        "**/*.pyc",
        "**/*.pyo",
        "**/*.egg-info",
        "**/tests",
        "**/test",
        "bin",
        "include",
        "lib64",
        "share",
    ]
    
    cleaned_count = 0
    for pattern in cleanup_patterns:
        for path in package_dir.glob(pattern):
            try:
                if path.is_file():
                    path.unlink()
                    cleaned_count += 1
                elif path.is_dir():
                    shutil.rmtree(path)
                    cleaned_count += 1
            except Exception as e:
                print(f"   ⚠ 清理 {path} 时出错: {e}")
    
    print(f"   ✓ 清理了 {cleaned_count} 个文件/目录")
    
    # 创建zip包
    zip_name = backend_dir / "scf_function.zip"
    print(f"\n5. 创建zip部署包: {zip_name}")
    if zip_name.exists():
        zip_name.unlink()
    
    os.chdir(package_dir.parent)
    with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(package_dir):
            # 跳过不需要的目录
            dirs[:] = [d for d in dirs if d not in ['__pycache__', '.git', '.pytest_cache']]
            for file in files:
                file_path = Path(root) / file
                arcname = file_path.relative_to(package_dir)
                zipf.write(file_path, arcname)
    
    # 获取文件大小
    zip_size = zip_name.stat().st_size / (1024 * 1024)  # MB
    print(f"   ✓ Zip包创建成功，大小: {zip_size:.2f} MB")
    
    # 清理临时目录
    print("\n6. 清理临时目录...")
    shutil.rmtree(package_dir)
    print("   ✓ 临时目录已清理")
    
    # 显示结果
    print("\n" + "=" * 50)
    print("✅ 部署包创建成功！")
    print("=" * 50)
    print(f"文件位置: {zip_name}")
    print(f"文件大小: {zip_size:.2f} MB")
    print("\n部署说明：")
    print("1. 登录腾讯云控制台 -> 云函数SCF")
    print("2. 新建函数 -> 本地上传zip包")
    print("3. 上传 scf_function.zip")
    print("4. 设置入口文件: scf_handler.main_handler")
    print("5. 运行环境: Python 3.9")
    print("6. 超时时间: 30秒")
    print("7. 内存: 256MB")
    print("8. 配置环境变量（详见SCF_DEPLOY.md）")
    print("=" * 50)
    
    return zip_name

if __name__ == "__main__":
    try:
        create_package()
    except KeyboardInterrupt:
        print("\n\n用户中断操作")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

