const ap = new APlayer({
    container: document.getElementById('aplayer'),
    autoplay: true,
    loop: 'all',
    order: 'random',
    theme: '#333333',
    volume: 0.3,
    listFolded: true,
    listMaxHeight: 60,
    preload: 'auto',
    audio: [
        {
            name: '蜘蛛糸モノポリ',
            artist: 'sasakure.UK / 初音ミク',
            url: 'https://www.ytmp3.cn/down/58072.mp3',
            cover: 'http://p1.music.126.net/b6cwIaAUy5MXSm3iNC0KNg==/109951163352158677.jpg?param=130y130',
        },
        {
            name: '丸の内サディステック',
            artist: '椎名林檎',
            url: 'https://m701.music.126.net/20240310153921/aeb8b9e7d6a39ea25a0b4d9f240ec90c/jdyyaac/520f/0e5e/005a/ee51973fe4944c7afee070edfac6d4dc.m4a',
            cover: 'http://p1.music.126.net/W4JdzEv6rWH-9axhEUGW3w==/719080604577566.jpg?param=130y130',
        }
    ]
});
