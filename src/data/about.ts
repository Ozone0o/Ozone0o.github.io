import type { LocalizedText } from './i18n';

export interface AboutListItem {
  label?: LocalizedText;
  text: LocalizedText;
}

export interface AboutSection {
  title: LocalizedText;
  paragraphs?: LocalizedText[];
  items?: AboutListItem[];
}

export const aboutContent: {
  lead: AboutSection;
  sections: AboutSection[];
} = {
  lead: {
    title: { zh: '关于 ozone layer', en: 'About ozone layer' },
    paragraphs: [
      {
        zh: '欢迎你，远道而来的客人！先适应一下这超高浓度的紫外辐射！',
        en: 'Welcome, traveller from afar. Give yourself a moment to adjust to this unusually concentrated ultraviolet radiation.',
      },
      {
        zh: 'ozone layer 是我的个人博客。因为本人的技术水平仍存在巨大的上升空间，所以这并不是一个技术博客，内容更多以生活记录、个人成长、书影音游为主。（音游？我听见你说音游了！）（不过这里指的真的不是音游，，）更新随缘。',
        en: 'ozone layer is my personal blog. There is still a great deal of room for my technical skills to grow, so this is not a technical blog. It is mostly for life records, personal growth, books, films, music, and games. (Rhythm games? I heard you say rhythm games!) (That is really not what I meant here.) Updates arrive when they arrive.',
      },
    ],
  },
  sections: [
    {
      title: { zh: '什么样的（？', en: 'What is here?' },
      items: [
        { label: { zh: '首页', en: 'Home' }, text: { zh: '顾名思义是首页，有博主的最新大作', en: 'The home page, with the author’s latest work.' } },
        { label: { zh: '关于', en: 'About' }, text: { zh: '就是你现在看的这一页，关于博客和博主的介绍', en: 'This page, with an introduction to the blog and its author.' } },
        { label: { zh: '归档', en: 'Archive' }, text: { zh: '所有文章按时间线速览', en: 'A timeline view of all the posts.' } },
        { label: { zh: '漫谈', en: 'Daily' }, text: { zh: '日记、流水账和碎碎念，有望成为本站更新频率最高的一个板块', en: 'Diaries, running accounts, and passing thoughts; likely the most frequently updated part of the site.' } },
        { label: { zh: '搜索', en: 'Search' }, text: { zh: '支持网站文章内部搜索', en: 'Search within the site’s articles.' } },
      ],
    },
    {
      title: { zh: '为什么要建立 ozone layer（？', en: 'Why make ozone layer?' },
      paragraphs: [
        {
          zh: '呃，首先我是一个非常喜欢逛社区的人，（这里的社区不包括微信QQ等熟人社交）逛各种各样的论坛，看各种各样的帖子一直都是我从小到大在互联网最大的乐趣。但是现在的各种社区、论坛不可避免地走向衰落（说不上来的感觉），只能说平台在不断让步，早就物是人非。以前的论坛虽然也有很多缺点，但是更让我感觉像是素未谋面的陌生人分享自己杂七杂八的东西，而我也在旁边听得津津有味，甚至受益匪浅。现在的论坛经常会给我一种“啊，这真的是真人发帖/评论？”的无能为力感。毫无疑问的我肯定还会逛论坛，但是并不会像以前那样了。',
          en: 'First, I have always loved wandering through online communities (not the familiar-social kind of WeChat or QQ). Forums and posts of all kinds have been one of my great pleasures on the internet since I was young. Yet communities and forums inevitably seem to decline; something in the feeling is difficult to name, and the platforms keep giving way until the people and atmosphere have changed. Older forums had plenty of flaws, but they felt like strangers who had never met sharing all sorts of things while I listened, absorbed, and sometimes learned a lot. These days a forum can leave me with the helpless feeling of, “Was that really posted or commented on by a real person?” I will certainly keep visiting forums, but not quite as I used to.',
        },
        {
          zh: '其次，虽然喜欢逛论坛，但是我很少（或者说从不）轻易在网上发帖、互动。我总是在害怕自己的输入不够多，见识不够广，又或者是出于这样那样的顾虑不敢从心所欲地发言。但是，即使是在现实中，能够持续深入自在地输出观点的机会也难能可贵。如果一直等着一个开口的良机，那我可能永远都不会开口了。同时，其实在生活中我的内心活动往往都非常跳跃，我希望能够把我的一些感受、灵感及时地记录下来。幸运的是，我在网上接触到了一些条理清晰并且乐于分享自己观点的人。为什么我不能够趁现在把观点和感受及时地记录下来呢？怀着这样的想法，我建立了这个博客。',
          en: 'Second, although I enjoy visiting forums, I rarely—or perhaps never—post or interact online without hesitation. I worry that I have not taken in enough, seen enough, or that one concern or another should keep me from speaking freely. Even in ordinary life, opportunities to express a sustained and considered view with ease are rare. If I keep waiting for the perfect opening, I may never speak at all. My thoughts also tend to jump around, and I want to record feelings and ideas while they are still present. Fortunately, I have encountered people online who explain themselves clearly and willingly share their views. Why not record my own thoughts and feelings while I can? With that in mind, I made this blog.',
        },
        {
          zh: '最后，现在是短视频时代，但是我真的几乎不看短视频。（起码是现在）（没有在说短视频没有正面影响的意思，我对其持中立态度）比起在地铁上刷好几个短视频我可能更喜欢看完一个长视频，比起视频我可能更喜欢文字。不可否认的是，我的脑袋基本上都是碎片化的知识，（看帖子看的）期末也基本上是速成，看文章越来越喜欢直接看结论，当我意识到自己的碎片化程度竟然如此之高并且还在以恐怖的速度持续更新时，我就知道我那可悲的未来可能也要像硬盘被格式化那样变成一堆堆数据了。总之，我在努力反抗这种浪潮，趁我还没有每天劳累得只能看轻松愉快的短视频结束一天。我要阅读，我要写作，我要记录，同时我要多接触现实，以此来与互联网达成一个微妙的平衡，巧妙的协议。',
          en: 'Finally, this is the age of short video, but I hardly watch short videos at all (at least for now). This is not a claim that short video has no positive effects; I am neutral about it. On a subway, I might rather finish one long video than swipe through several short ones, and I might rather read than watch. It is true that my head is mostly made of fragmented knowledge (much of it gathered from posts). Exams are often crammed for, and I increasingly want to read an article’s conclusion first. When I realized how fragmented I had become—and how frighteningly fast the process was continuing—I knew my miserable future might turn into piles of data, like a hard drive being formatted. In any case, I am trying to resist that current while I can still do more than end every exhausted day with something light and cheerful. I want to read, write, and record, while also meeting more of reality, finding a delicate balance and a workable agreement with the internet.',
        },
        {
          zh: '总之，正如伍尔夫的一本书 “A Room of One’s Own”，我希望这里也能成为一个 “a room of one’s own”。',
          en: 'In short, as in Virginia Woolf’s book A Room of One’s Own, I hope this can become a room of my own too.',
        },
      ],
    },
    {
      title: { zh: '关于我', en: 'About me' },
      paragraphs: [
        { zh: '一个刚开张的菜鸡（）', en: 'A beginner who has only just opened the shop (()).' },
      ],
    },
    {
      title: { zh: '省流版', en: 'Short version' },
      paragraphs: [
        {
          zh: '很 i 的 enfp  || 秋天出生  || EE 在读  || 愚蠢的大学生 || 绩点堪忧 || 四处游荡 || 唯物主义 || i 历史 || 驼背十八年 || 懒人一个 || GAMER || 新新 GAME DESIGNER || 低价回收旧数码破烂 || 桌（zhuō）游（yóu）er || 高强度网上冲浪 || 想成为爵士鼓手但是还是先把摇滚搞清楚，不然还可以去打数摇（） || 牌佬 || 超长睡眠 || 沙龙爱好者 || 任何事都半吊子的多面手 || 我宣布 MEME 是本世代互联网最伟大发明（啊？） || 麦金会员（已过期） || 背包客 || 废墟爱好者 || 观鸟人&养鸟人 || 我去，核！ || 理财苦手 || 新陈代谢缓慢 || 一斤鸭梨！ || 人文社科灰域长期探索中 loading… || 太喜欢喝饮料了我不会得糖尿病吧 || 电动车 gai 溜子 || idea bank 长期工作 || （菜菜的）football player || KTV dancer || 好绿的剧院韭菜 || livehouse 蹦蹦 || 朋友是二刺螈 || 喜欢拍照见见世面 || 在严肃和轻松之间反复跳脱 || 普通人',
          en: 'A very introverted ENFP || born in autumn || studying EE || a foolish university student || worrying grades || wandering around || materialist || interested in history || eighteen years of bad posture || lazy || GAMER || new GAME DESIGNER || collector of cheap old electronics || board-game person || intense internet surfer || wants to become a jazz drummer, but should probably understand rock first, otherwise maybe play math rock () || card player || long sleeper || salon enthusiast || an all-rounder who is half-good at everything || MEME is the greatest invention of this internet generation (what?) || an expired 麦金 membership || backpacker || ruins enthusiast || bird watcher & bird keeper || nuclear, apparently! || bad at finance || slow metabolism || one jin of pear pressure! || long-term exploration of the humanities and social sciences’ grey areas, loading… || drinks too many beverages || electric-bike street drifter || idea bank in long-term operation || (not very good) football player || KTV dancer || theatre investor in deep green || livehouse bouncer || friends with anime fans || likes taking photos and seeing the world || repeatedly switching between serious and light-hearted || an ordinary person',
        },
      ],
    },
    {
      title: { zh: '【目前做的】', en: '[Currently doing]' },
      items: [
        { text: { zh: '大学在读', en: 'Studying at university' } },
        { text: { zh: '读书看电影打游戏', en: 'Reading, watching films, and playing games' } },
        { text: { zh: '出去玩', en: 'Going out' } },
      ],
    },
    {
      title: { zh: '【以后想做的】', en: '[Would like to do]' },
      items: [
        { text: { zh: '四处旅游', en: 'Travel around' } },
        { text: { zh: '拥有强壮的身体', en: 'Have a strong body' } },
        { text: { zh: '遇见很多有意思的人', en: 'Meet many interesting people' } },
      ],
    },
  ],
};
