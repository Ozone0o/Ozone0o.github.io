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
            url: 'http://music.163.com/song/media/outer/url?id=26440351.mp3',
            cover: 'http://p1.music.126.net/b6cwIaAUy5MXSm3iNC0KNg==/109951163352158677.jpg?param=130y130',
        },
        {
            name: '丸の内サディステック',
            artist: '椎名林檎',
            url: 'http://music.163.com/song/media/outer/url?id=1381350481.mp3',
            cover: 'http://p1.music.126.net/W4JdzEv6rWH-9axhEUGW3w==/719080604577566.jpg?param=130y130',
        }
    ]
});
