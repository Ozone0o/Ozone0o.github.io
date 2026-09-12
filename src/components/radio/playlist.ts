export interface RadioTrack {
  title: string;
  artist: string;
  src?: string;
  cover?: string;
  disabled?: boolean;
  legacyUrl?: string;
  legacyCoverUrl?: string;
}

/**
 * The legacy site used these five tracks through APlayer. Their old URLs were
 * HTTP-only, so they remain reference metadata instead of production sources.
 * Add a verified HTTPS URL or a local `/audio/...` source before enabling one.
 */
export const radioPlaylist: RadioTrack[] = [
  {
    title: '蜘蛛糸モノポリ',
    artist: 'sasakure.UK / 初音ミク',
    disabled: true,
    legacyUrl: 'http://music.163.com/song/media/outer/url?id=26440351.mp3',
    legacyCoverUrl: 'http://p1.music.126.net/b6cwIaAUy5MXSm3iNC0KNg==/109951163352158677.jpg?param=130y130',
  },
  {
    title: '丸の内サディステック',
    artist: '椎名林檎',
    disabled: true,
    legacyUrl: 'http://music.163.com/song/media/outer/url?id=1381350481.mp3',
    legacyCoverUrl: 'http://p1.music.126.net/W4JdzEv6rWH-9axhEUGW3w==/719080604577566.jpg?param=130y130',
  },
  {
    title: 'Value',
    artist: 'Ado',
    disabled: true,
    legacyUrl: 'http://music.163.com/song/media/outer/url?id=2129117330.mp3',
    legacyCoverUrl: 'http://p1.music.126.net/7gzYj1itC6BpKDlk6sZtTA==/109951169359997375.jpg?param=130y130',
  },
  {
    title: '波兰首都是上海',
    artist: 'yourboyfriendsucks!',
    disabled: true,
    legacyUrl: 'http://music.163.com/song/media/outer/url?id=419596181.mp3',
    legacyCoverUrl: 'http://p2.music.126.net/S0NDCxJ7__2DuC3q8rHm_A==/109951164419258439.jpg?param=130y130',
  },
  {
    title: 'Have You Ever',
    artist: 'mindfreakkk',
    disabled: true,
    legacyUrl: 'http://music.163.com/song/media/outer/url?id=1842735440.mp3',
    legacyCoverUrl: 'http://p2.music.126.net/DxA_1eMyZiyse4Ed8IXgOA==/109951165953588453.jpg?param=130y130',
  },
];
