---
title: 冷启动问题实战手册
date: 2026-07-22
category: performance
excerpt: 为什么第一个请求总是慢，以及如何在不自欺欺人的前提下度量并压缩它。
tags: [lambda, p99, trace]
readingMinutes: 8
featured: false
order: 02
draft: false
---

# 冷启动问题实战手册

为什么第一个请求总是慢？因为它真的在做更多的事——加载代码、建立连接、预热缓存。

## 先度量，再优化

用 p99 而不是平均值来描述冷启动，否则你会被自己骗到。
