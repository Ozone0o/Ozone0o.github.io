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
        },
        {
            name: 'Value',
            artist: 'Ado',
            url: 'http://music.163.com/song/media/outer/url?id=2129117330.mp3',
            cover: 'http://p1.music.126.net/7gzYj1itC6BpKDlk6sZtTA==/109951169359997375.jpg?param=130y130',
        },
        {
            name: '波兰首都是上海',
            artist: 'yourboyfriendsucks!',
            url: 'http://music.163.com/song/media/outer/url?id=419596181.mp3',
            cover: 'http://p2.music.126.net/S0NDCxJ7__2DuC3q8rHm_A==/109951164419258439.jpg?param=130y130',
        },
        {
            name: 'Have You Ever',
            artist: 'mindfreakkk',
            url: 'http://music.163.com/song/media/outer/url?id=1842735440.mp3',
            cover: 'http://p2.music.126.net/DxA_1eMyZiyse4Ed8IXgOA==/109951165953588453.jpg?param=130y130',
        }
    ]
});
