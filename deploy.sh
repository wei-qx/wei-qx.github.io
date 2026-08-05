#!/usr/bin/env sh
###
 # @Author: wei_qx
 # @Date: 2021-09-04 15:49:24
 # @Description: 
 # @LastEditor: wei_qx
 # @LastEditTime: 2021-09-04 16:36:21
### 

# 确保脚本爬出遇到的错误
set -e

# 生成静态文件
npm run docs:build

# 进入生成的文件夹
cd docs/.vitepress/dist

git init
git add -A
git commit -m 'deploy'

git push -f git@github.com:wei-qx/wei-qx.github.io.git master:gh-pages

cd -
