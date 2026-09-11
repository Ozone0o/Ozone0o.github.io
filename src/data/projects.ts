import type { LocalizedText } from './i18n';

export interface ProjectTimelineItem {
  date: string;
  title: LocalizedText;
  description: LocalizedText;
}

export interface ProjectRepository {
  name: string;
  href: string;
}

export interface ProjectRecord {
  title: string;
  slug: string;
  year: string;
  status: LocalizedText;
  shortDescription: LocalizedText;
  summary: LocalizedText;
  role: LocalizedText;
  currentResult: LocalizedText;
  evidence: LocalizedText;
  repositories: ProjectRepository[];
  technologies: string[];
  timeline: ProjectTimelineItem[];
}

export const projects: ProjectRecord[] = [
  {
    title: 'Axiom',
    slug: 'axiom',
    year: '2026',
    status: { zh: 'v0.1 / 已冻结', en: 'v0.1 / frozen' },
    shortDescription: { zh: '机器人能力契约与校验工具', en: 'Robot capability contracts and validation' },
    summary: {
      zh: '一个用 YAML / JSON 描述机器人身份、能力、传输方式、可用性、安全等级、依赖和可观测输出的小型能力契约工具。',
      en: 'A small capability-contract tool for describing robot identity, capabilities, transport, availability, safety class, dependencies, and observable output in YAML or JSON.',
    },
    role: {
      zh: '实现 v0.1 schema、命令行工具、示例和一致性验证。',
      en: 'Implemented the v0.1 schema, command-line surface, examples, and conformance checks.',
    },
    currentResult: {
      zh: '公开仓库包含 v0.1 JSON Schema 和示例；CLI 提供 validate、lint、docs、generate、diff、match、list。',
      en: 'The public repository contains the v0.1 JSON Schema and examples; its CLI provides validate, lint, docs, generate, diff, match, and list commands.',
    },
    evidence: {
      zh: 'README：capability contract 的字段和语义；pyproject.toml：PyYAML、jsonschema 与 axiom CLI；提交记录：schema、examples、conformance contract 和 release evidence。',
      en: 'README: capability-contract fields and semantics; pyproject.toml: PyYAML, jsonschema, and the axiom CLI; commits: schema, examples, the conformance contract, and release evidence.',
    },
    repositories: [{ name: 'Ozone0o/Axiom', href: 'https://github.com/Ozone0o/Axiom' }],
    technologies: ['Python', 'YAML', 'JSON Schema', 'CLI'],
    timeline: [
      {
        date: '2026.08',
        title: { zh: '定义 v0.1 能力 schema', en: 'Defined the v0.1 capability schema' },
        description: {
          zh: '建立机器人身份、能力类型、传输方式、安全等级和可观测输出等字段，并加入 JSON Schema。',
          en: 'Established fields for robot identity, capability type, transport, safety class, and observable output, backed by JSON Schema.',
        },
      },
      {
        date: '2026.08',
        title: { zh: '扩展 CLI 与示例', en: 'Expanded the CLI and examples' },
        description: {
          zh: 'README 和提交记录列出了 validate、lint、docs、generate、diff、match、list 等命令及对应示例。',
          en: 'The README and commits document validate, lint, docs, generate, diff, match, and list commands with examples.',
        },
      },
      {
        date: '2026.08',
        title: { zh: '冻结一致性契约', en: 'Froze the conformance contract' },
        description: {
          zh: '提交记录显示 v0.1 conformance contract、CI 示例验证和公开 release evidence 已整理。',
          en: 'The commit history records the v0.1 conformance contract, CI example validation, and public release evidence.',
        },
      },
    ],
  },
  {
    title: 'Aegis',
    slug: 'aegis',
    year: '2026',
    status: { zh: 'v0.3 / 持续整理', en: 'v0.3 / ongoing' },
    shortDescription: { zh: 'ROS 2 健康监测 watchdog', en: 'A ROS 2 health watchdog' },
    summary: {
      zh: '面向 ROS 2 的健康 watchdog，观察 topics、nodes、processes、资源和依赖，并把结果归纳为可恢复的状态变化。',
      en: 'A ROS 2 health watchdog that observes topics, nodes, processes, resources, and dependencies, then reduces them to recoverable state transitions.',
    },
    role: {
      zh: '实现监测模型、六状态 watchdog、YAML policy 和恢复控制参数。',
      en: 'Implemented monitoring models, the six-state watchdog, YAML policies, and recovery controls.',
    },
    currentResult: {
      zh: 'README 定义 UNKNOWN、HEALTHY、DEGRADED、STALE、MISSING、RECOVERING 六种状态；仓库包含 policy、package.xml 和 CLI。',
      en: 'The README defines UNKNOWN, HEALTHY, DEGRADED, STALE, MISSING, and RECOVERING; the repository includes policies, package.xml, and a CLI.',
    },
    evidence: {
      zh: 'README：监测对象、状态和恢复语义；pyproject.toml：v0.3.0、PyYAML 与 aegis CLI；提交记录：monitor/model 分离、六状态监测和 QoS fallback。',
      en: 'README: monitored objects, states, and recovery semantics; pyproject.toml: v0.3.0, PyYAML, and the aegis CLI; commits: monitor/model separation, six-state monitoring, and QoS fallback.',
    },
    repositories: [{ name: 'Ozone0o/Aegis', href: 'https://github.com/Ozone0o/Aegis' }],
    technologies: ['Python', 'ROS 2', 'YAML', 'Watchdog'],
    timeline: [
      {
        date: '2026.08',
        title: { zh: '拆分监测器与模型', en: 'Separated monitors from models' },
        description: {
          zh: '提交记录显示 monitor 与 model 的职责被分开，为状态判断和恢复逻辑留下清晰边界。',
          en: 'The commit history separates monitor and model responsibilities, leaving a clearer boundary for state decisions and recovery logic.',
        },
      },
      {
        date: '2026.08',
        title: { zh: '加入六状态 watchdog', en: 'Added six-state watchdog monitoring' },
        description: {
          zh: 'watchdog 从未知、健康、降级、过期、缺失到恢复中形成完整状态集合。',
          en: 'The watchdog now covers the documented states from unknown and healthy through degraded, stale, missing, and recovering.',
        },
      },
      {
        date: '2026.08',
        title: { zh: '记录 QoS fallback', en: 'Documented the QoS fallback' },
        description: {
          zh: '近期提交补充真实验证说明，并强化 QoS fallback 的文档与实现边界。',
          en: 'Recent commits add real-world validation notes and harden the documented QoS fallback boundary.',
        },
      },
    ],
  },
  {
    title: 'Gauntlet',
    slug: 'gauntlet',
    year: '2026',
    status: { zh: 'v0.3 / alpha', en: 'v0.3 / alpha' },
    shortDescription: { zh: '机器人工具的基准测试框架', en: 'Benchmark runner for robot tools' },
    summary: {
      zh: '一个 vendor-neutral 的机器人工具与 driver benchmark runner，用 case、adapter、timeout、safety 和 verifier 组织测试。',
      en: 'A vendor-neutral benchmark runner for robot tools and drivers, organized around cases, adapters, timeouts, safety, and verifiers.',
    },
    role: {
      zh: '实现 benchmark case、adapter、结构化报告和多种结果 verifier。',
      en: 'Implemented benchmark cases, adapters, structured reports, and multiple result verifiers.',
    },
    currentResult: {
      zh: 'README 已列出 mock、Python、HTTP、command、ROS 2 adapters，以及 return、topic、rate、pose、joint、vision、custom verifiers 和 p50/p95/p99 指标。',
      en: 'The README lists mock, Python, HTTP, command, and ROS 2 adapters, plus return, topic, rate, pose, joint, vision, and custom verifiers with p50/p95/p99 metrics.',
    },
    evidence: {
      zh: 'README：benchmark case、adapter、verifier 和报告结构；pyproject.toml：v0.3.0 与 Alpha 状态；提交记录：去重、CI、mock_robot 示例和 vendor-neutral framework。',
      en: 'README: benchmark cases, adapters, verifiers, and report structure; pyproject.toml: v0.3.0 and Alpha status; commits: deduplication, CI, the mock_robot example, and the vendor-neutral framework.',
    },
    repositories: [{ name: 'Ozone0o/Gauntlet', href: 'https://github.com/Ozone0o/Gauntlet' }],
    technologies: ['Python', 'ROS 2', 'HTTP', 'Benchmarking'],
    timeline: [
      {
        date: '2026.08',
        title: { zh: '建立 benchmark runner', en: 'Established the benchmark runner' },
        description: {
          zh: 'README 将工具调用、adapter、timeout、safety 和 verifier 组织成可复用 benchmark case。',
          en: 'The README organizes tool calls, adapters, timeouts, safety, and verifiers into reusable benchmark cases.',
        },
      },
      {
        date: '2026.08',
        title: { zh: '加入多种 adapter 与 verifier', en: 'Added adapters and verifiers' },
        description: {
          zh: '公开说明覆盖 mock、Python、HTTP、command、ROS 2 入口，以及 topic、rate、pose、joint 和 vision 检查。',
          en: 'The public documentation covers mock, Python, HTTP, command, and ROS 2 entry points plus topic, rate, pose, joint, and vision checks.',
        },
      },
      {
        date: '2026.08',
        title: { zh: '整理 benchmark evidence', en: 'Restructured benchmark evidence' },
        description: {
          zh: '近期提交整理真实 benchmark evidence，并保留结构化原始数据与报告输出。',
          en: 'Recent commits restructure real benchmark evidence while retaining structured raw data and report output.',
        },
      },
    ],
  },
  {
    title: 'Roscope',
    slug: 'roscope',
    year: '2026',
    status: { zh: 'v0.2 / beta', en: 'v0.2 / beta' },
    shortDescription: { zh: 'ROS 2 topic health 可观测工具', en: 'ROS 2 topic health observability' },
    summary: {
      zh: '一个观察 ROS 2 topic 健康度和通信故障的 CLI，关注 graph、endpoint、rate、freshness、QoS 与 finding code。',
      en: 'A CLI for observing ROS 2 topic health and communication failures through graphs, endpoints, rate, freshness, QoS, and finding codes.',
    },
    role: {
      zh: '实现 inspect、scan、watch、snapshot、graph 等观察入口和 topic health 指标。',
      en: 'Implemented the inspect, scan, watch, snapshot, and graph entry points along with topic-health metrics.',
    },
    currentResult: {
      zh: '仓库 README 和 pyproject.toml 将项目标为 Beta，并提供 ROS 2 package、CLI 和 topic health inspection metrics。',
      en: 'The README and pyproject.toml mark the project Beta and provide a ROS 2 package, CLI, and topic-health inspection metrics.',
    },
    evidence: {
      zh: 'README：inspect、scan、watch、snapshot、graph 及 finding codes；pyproject.toml：v0.2.0 与 Beta 状态；提交记录：topic health metrics、CI/demo 和 stream health 说明。',
      en: 'README: inspect, scan, watch, snapshot, graph, and finding codes; pyproject.toml: v0.2.0 and Beta status; commits: topic-health metrics, CI/demo, and stream-health notes.',
    },
    repositories: [{ name: 'Ozone0o/roscope', href: 'https://github.com/Ozone0o/roscope' }],
    technologies: ['Python', 'ROS 2', 'CLI', 'Observability'],
    timeline: [
      {
        date: '2026.08',
        title: { zh: '搭建 ROS 2 观察 CLI', en: 'Built the ROS 2 observation CLI' },
        description: {
          zh: '项目从 graph、endpoint 和通信观察入口开始，形成 inspect、scan、watch、snapshot、graph 命令。',
          en: 'The project started with graph, endpoint, and communication observation surfaces, forming inspect, scan, watch, snapshot, and graph commands.',
        },
      },
      {
        date: '2026.08',
        title: { zh: '加入 topic health 指标', en: 'Added topic-health metrics' },
        description: {
          zh: '提交记录增加 rate、freshness、QoS 和 finding code 等 topic health inspection 内容。',
          en: 'The commit history adds rate, freshness, QoS, and finding-code details to topic-health inspection.',
        },
      },
      {
        date: '2026.08',
        title: { zh: '围绕 stream health 整理说明', en: 'Framed the stream-health notes' },
        description: {
          zh: '近期提交补充 CI/demo，并把真实验证说明聚焦到 stream health。',
          en: 'Recent commits add CI/demo material and focus the real-world validation notes on stream health.',
        },
      },
    ],
  },
  {
    title: 'Luma',
    slug: 'luma',
    year: '2026',
    status: { zh: 'v0.2 / 持续整理', en: 'v0.2 / ongoing' },
    shortDescription: { zh: '视觉智能与 servo control 框架', en: 'Visual intelligence and servo control' },
    summary: {
      zh: '一个轻量的 visual intelligence 与 servo control framework，把 Camera、Detector、Controller 和 Robot Adapter 串成 pipeline，并提供 simulation。',
      en: 'A lightweight visual-intelligence and servo-control framework connecting Camera, Detector, Controller, and Robot Adapter stages with simulation support.',
    },
    role: {
      zh: '实现 ServoPipeline、EMAFilter、simulation 和可选视觉依赖的包装。',
      en: 'Implemented ServoPipeline, EMAFilter, simulation, and the optional-vision dependency boundary.',
    },
    currentResult: {
      zh: 'README 描述 Camera → Detector → Controller → Robot Adapter pipeline；仓库提供 simulation，并把 OpenCV、YOLO、AprilTag 列为可选能力。',
      en: 'The README describes a Camera → Detector → Controller → Robot Adapter pipeline; the repository provides simulation and lists OpenCV, YOLO, and AprilTag as optional capabilities.',
    },
    evidence: {
      zh: 'README：pipeline 和 simulation；pyproject.toml：v0.2.0、numpy/PyYAML 与可选视觉依赖；提交记录：ServoPipeline/EMAFilter 测试、visual servo demo 和 packaging。',
      en: 'README: pipeline and simulation; pyproject.toml: v0.2.0, numpy/PyYAML, and optional vision dependencies; commits: ServoPipeline/EMAFilter tests, a visual-servo demo, and packaging.',
    },
    repositories: [{ name: 'Ozone0o/luma', href: 'https://github.com/Ozone0o/luma' }],
    technologies: ['Python', 'NumPy', 'OpenCV', 'YOLO', 'AprilTag'],
    timeline: [
      {
        date: '2026.08',
        title: { zh: '定义视觉 servo pipeline', en: 'Defined the visual-servo pipeline' },
        description: {
          zh: 'README 将 Camera、Detector、Controller 和 Robot Adapter 定义为连续的处理阶段，并配有 simulation。',
          en: 'The README defines Camera, Detector, Controller, and Robot Adapter as sequential stages and includes simulation.',
        },
      },
      {
        date: '2026.08',
        title: { zh: '加入 pipeline 与滤波测试', en: 'Added pipeline and filter tests' },
        description: {
          zh: '提交记录为 ServoPipeline 和 EMAFilter 增加测试，随后加入 visual servo demo。',
          en: 'The commit history adds tests for ServoPipeline and EMAFilter, followed by a visual-servo demo.',
        },
      },
      {
        date: '2026.08',
        title: { zh: '整理可选视觉依赖', en: 'Clarified optional vision dependencies' },
        description: {
          zh: 'pyproject.toml 将 OpenCV、Ultralytics 和 pupil-apriltags 放在可选依赖中，并完成 packaging review。',
          en: 'pyproject.toml keeps OpenCV, Ultralytics, and pupil-apriltags optional while the packaging review is recorded in the commits.',
        },
      },
    ],
  },
  {
    title: 'MiniVocab',
    slug: 'minivocab',
    year: '2026',
    status: { zh: 'v1.0 / macOS', en: 'v1.0 / macOS' },
    shortDescription: { zh: '本地优先的 macOS 词汇卡工具', en: 'A local-first macOS vocabulary tool' },
    summary: {
      zh: '一个 macOS vocabulary card 应用，支持本地复习状态、CSV / TSV / TXT / JSON 导入，以及例句显示。',
      en: 'A macOS vocabulary-card app with local-first review state, CSV / TSV / TXT / JSON import, and example-sentence display.',
    },
    role: {
      zh: '实现 SwiftUI / AppKit / SwiftData 应用、导入流程、session manager 和发布包。',
      en: 'Implemented the SwiftUI / AppKit / SwiftData app, import flow, session manager, and release package.',
    },
    currentResult: {
      zh: 'README 提供直接 DMG 下载；Package.swift 指向 macOS 14 可执行应用，近期提交包含 v1.0 README、session manager rewrite 和 DMG 重建。',
      en: 'The README provides a direct DMG download; Package.swift targets a macOS 14 executable, with recent commits covering the v1.0 README, session-manager rewrite, and DMG rebuild.',
    },
    evidence: {
      zh: 'README：local-first review、文件导入和 DMG；Package.swift：macOS 14、AppKit/SwiftUI/SwiftData；提交记录：例句修复、session manager、v0.1/v1.0 与直接下载。',
      en: 'README: local-first review, file import, and DMG; Package.swift: macOS 14 with AppKit/SwiftUI/SwiftData; commits: sentence fix, session manager, v0.1/v1.0, and direct download.',
    },
    repositories: [{ name: 'Ozone0o/MiniVocab', href: 'https://github.com/Ozone0o/MiniVocab' }],
    technologies: ['Swift', 'SwiftUI', 'AppKit', 'SwiftData', 'macOS'],
    timeline: [
      {
        date: '2026.08',
        title: { zh: '建立 macOS vocabulary card', en: 'Built the macOS vocabulary card app' },
        description: {
          zh: 'Package.swift 将它定义为 macOS 14 executable，并使用 AppKit、SwiftUI 和 SwiftData。',
          en: 'Package.swift defines a macOS 14 executable using AppKit, SwiftUI, and SwiftData.',
        },
      },
      {
        date: '2026.08',
        title: { zh: '重写 session manager', en: 'Reworked the session manager' },
        description: {
          zh: '提交记录同时修复例句显示，并重写 session manager 的复习流程。',
          en: 'The commit history fixes example-sentence display and rewrites the review flow in the session manager.',
        },
      },
      {
        date: '2026.08',
        title: { zh: '提供 v1.0 与 DMG', en: 'Published v1.0 and a DMG' },
        description: {
          zh: 'README、icon/rebuild 和 direct DMG 提交把当前 macOS 构建整理为可下载版本。',
          en: 'README, icon/rebuild, and direct-DMG commits package the current macOS build as a downloadable version.',
        },
      },
    ],
  },
  {
    title: 'Chat Calendar',
    slug: 'chat-calendar',
    year: '2025.04',
    status: { zh: '本地应用 / 早期版本', en: 'local app / early version' },
    shortDescription: { zh: '自然语言日程提取工具', en: 'Natural-language calendar extraction' },
    summary: {
      zh: '一个 Flask + Ollama 的本地日程工具，把自然语言中的事件、时间、地点和流程提取为 JSON。',
      en: 'A local Flask + Ollama calendar tool that extracts event, time, location, and process data from natural language as JSON.',
    },
    role: {
      zh: '实现 Flask 页面、Ollama 请求和日程字段提取流程。',
      en: 'Implemented the Flask surface, Ollama request path, and calendar-field extraction flow.',
    },
    currentResult: {
      zh: 'README 记录了本地运行方式和 8080 端口；app.py / chat.py 展示 Flask、Ollama 与事件 JSON 提取的实现。',
      en: 'The README documents local setup on port 8080; app.py and chat.py show the Flask, Ollama, and event-JSON extraction implementation.',
    },
    evidence: {
      zh: 'README：项目用途、Ollama 模型和本地启动；app.py/chat.py：Flask route、模型调用和 JSON 字段；提交记录：2025.04 的初始实现、功能提交和 README 更新。',
      en: 'README: purpose, Ollama model, and local setup; app.py/chat.py: Flask route, model call, and JSON fields; commits: the 2025.04 initial implementation, feature commits, and README update.',
    },
    repositories: [{ name: 'Ozone0o/chat_calender', href: 'https://github.com/Ozone0o/chat_calender' }],
    technologies: ['Python', 'Flask', 'Ollama', 'JSON'],
    timeline: [
      {
        date: '2025.04',
        title: { zh: '搭建本地 Flask 应用', en: 'Started the local Flask app' },
        description: {
          zh: '初始实现建立 Flask 页面和本地运行入口，README 记录了 8080 端口。',
          en: 'The initial implementation established the Flask page and local entry point; the README records port 8080.',
        },
      },
      {
        date: '2025.04',
        title: { zh: '接入 Ollama 日程提取', en: 'Connected Ollama calendar extraction' },
        description: {
          zh: 'chat.py 将自然语言请求交给 Ollama，并提取事件、时间、地点和流程等 JSON 字段。',
          en: 'chat.py sends natural-language requests to Ollama and extracts JSON fields for event, time, location, and process.',
        },
      },
      {
        date: '2025.04',
        title: { zh: '补充运行说明', en: 'Expanded the setup notes' },
        description: {
          zh: '后续提交集中在功能补充和 README 更新，仓库保留为一个本地应用实现。',
          en: 'Later commits focus on feature additions and README updates, leaving the repository as a local application implementation.',
        },
      },
    ],
  },
];
