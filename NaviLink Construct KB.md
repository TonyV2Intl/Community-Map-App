# H5调起地图导航

注：POI=Point of Interest

## 腾讯地图

文档：[https://lbs.qq.com/webApi/uriV1/uriGuide/uriWebRoute]（type有bus、drive、walk）
官网文档示例：[https://apis.map.qq.com/uri/v1/routeplan?type=bus&from=我的家&fromcoord=39.980683,116.302&to=中关村&tocoord=39.9836,116.3164&policy=1&referer=OB4BZ-D4W3U-B7VVO-4PJWW-6TKDJ-WPB77]
最简：[https://apis.map.qq.com/uri/v1/routeplan?type=bus&to=中关村]
最简效果：自动获取用户当前位置作为起点，若无法定位需要用户手动输入起点并选择起点POI；需要用户点选终点POI（指定type为walk时，若距离过长，步行导航结果不会显示；如果是用户手动输入起点，会弹出建议驾车提示，点击提示链接可跳转至驾车路线规划；如果是自动获取用户位置作为起点，则只有建议尝试其他交通方式的提示，没有链接）
建议：[https://apis.map.qq.com/uri/v1/routeplan?type=bus&to=中关村&tocoord=39.9836,116.3164&coord_type=1]（coord_type默认=2；=1为WGS84坐标系；=2为GCJ-02坐标系）
建议效果：直接展示路线，不再需要用户点选终点POI

## 高德地图

文档：[https://lbs.amap.com/api/uri-api/guide/travel/route]（mode有car、bus、walk、ride）
官网文档示例：[https://uri.amap.com/navigation?from=116.478346,39.997361,startpoint&to=116.3246,39.966577,endpoint&via=116.402796,39.936915,midwaypoint&mode=car&policy=1&src=mypage&callnative=0]
最简：[https://uri.amap.com/navigation?to=116.3246,39.966577&mode=car]
最简效果：自动获取用户当前位置作为起点，若无法定位需要用户手动输入起点并选择起点POI（指定type为walk时，若距离过长，步行导航结果不会显示，且无任何进一步提示；终点名称不写，默认叫“终点”；必须指定坐标，若不指定直接重定向到主界面）
建议：[https://uri.amap.com/navigation?to=116.3246,39.966577,endpoint&mode=car]
建议效果：直接展示路线，不再需要用户点选终点POI

## 百度地图

文档：[https://baidumap.apifox.cn/api-32942333]，[https://baidumap.apifox.cn/doc-1196749]里面更详细但是需要找一下（mode有transit、driving、walking）
官网文档示例：[http://api.map.baidu.com/direction?origin=latlng:34.264642646862,108.95108518068|name:我家&destination=大雁塔&mode=driving&region=西安&output=html&src=webapp.baidu.openAPIdemo]
最简：[http://api.map.baidu.com/direction?destination=大雁塔&mode=driving&output=html]
最简效果：自动重定向为公交模式（无论链接中指定的是什么模式），需要点一下搜索按钮才会获取用户当前位置作为起点；需要用户点选终点POI，如果目标POI只有一个则不需要选择（选择步行模式时，若距离过长，步行导航结果不会显示，且无任何进一步提示；若指定origin但是不指定region，直接重定向到主界面）
建议：[http://api.map.baidu.com/direction?origin=latlng:34.264642646862,108.95108518068|name:我家&destination=大雁塔&mode=driving&region=西安&output=html]
建议效果：需要用户点选终点POI，如果目标POI只有一个则不需要选择
