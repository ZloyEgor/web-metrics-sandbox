# Исследовательская платформа для анализа метрик веб-приложений no-code и low-code платформ

## Введение

Данное приложение представляет исследовательскую платформу-песочницу, предназначенную для автоматизированного сбора, анализа и сравнения метрик производительности, оптимизации и доступности веб-приложений, созданных на основе no-code и low-code платформ. Актуальность разработки обусловлена быстрым ростом экосистемы визуального программирования и необходимостью стандартизированной оценки качества создаваемых приложений в условиях ограниченной наблюдаемости внутренних компонентов таких платформ.

Экосистема no-code и low-code решений характеризуется высокой долей конфигурационных параметров, неоднородностью развертываний и частично скрытой архитектурой, что усложняет воспроизводимую оценку характеристик создаваемых приложений. Существующие инструменты аудита и мониторинга применяются разрозненно, что приводит к несопоставимости результатов и значительным ручным затратам при повторных измерениях. Данная платформа обеспечивает единый процесс проведения экспериментов и получения сопоставимых метрик для различных типов веб-приложений.

## Архитектура системы

Платформа реализована как клиент-серверная система с разделением ответственности между пользовательским интерфейсом и вычислительно емкими процедурами аудита. Фронтенд представляет одностраничное веб-приложение на основе React и TypeScript, обеспечивающее управление тестируемыми платформами, запуск измерений и визуализацию результатов. Бэкенд выполнен на Node.js с использованием Express и предназначен для проведения аудита Google Lighthouse в headless-режиме и управления Docker-контейнерами.

Персистентность данных обеспечивается локальным хранилищем IndexedDB, что позволяет накапливать историю измерений без привлечения внешней инфраструктуры и обеспечивает воспроизводимость серий замеров в рамках одной рабочей среды. Система поддерживает несколько типов подключения тестируемых объектов: внешние URL, локально запущенные приложения и сервисы в контейнерном окружении.

## Методики сбора метрик

Конвейер автоматизированного сбора метрик объединяет три основные методики измерений в рамках единой процедуры. Первая методика основана на аудите Google Lighthouse, предоставляющем стандартизированные оценки производительности, доступности, SEO и соответствия лучшим практикам веб-разработки. Lighthouse обеспечивает детальную диагностическую информацию в виде перечня неуспешных проверок и рекомендаций по оптимизации.

Вторая методика использует Web Performance API для сбора фактических временных характеристик загрузки и подготовки документа к взаимодействию. Данный подход дополняет результаты аудита прикладными метриками поведения приложений в условиях выполнения в браузере и повышает полноту наблюдения за динамикой загрузки.

Третья методика реализует проверку доступности с фиксацией статуса доступности и времени отклика. Процедура обеспечивает базовую оценку эксплуатационных характеристик и позволяет рассматривать качество приложения как устойчивость при обращении по заданному адресу. Последовательное выполнение методик организовано в виде этапов с контролем прогресса и обработкой частичных ошибок без остановки эксперимента.

## Функциональные возможности

Система обеспечивает полный жизненный цикл управления тестируемыми платформами, включая создание, редактирование и удаление записей с поддержкой категоризации и валидации данных. Для каждой платформы фиксируются идентификатор, отображаемое имя, описание, категория и параметры развертывания, определяющие способ обращения к тестируемому приложению.

Модуль визуализации предоставляет детализированные отчеты по отдельным платформам с агрегированными оценками и подробными показателями, включая диагностическую информацию Lighthouse. Реализован модуль сравнительного анализа для выявления различий между решениями по ключевым категориям и определения лидирующих платформ по отдельным группам показателей.

Результаты измерений сохраняются в едином формате с временными метками и связями между платформами и сериями измерений, что обеспечивает сопоставимость результатов и возможность повторного анализа. Система устойчива к частичным ошибкам измерений и обеспечивает деградацию без потери доступных показателей.

## Инструкция по развертыванию

### Локальный запуск (dev-режим)

Автоматический запуск всех компонентов системы осуществляется исполнением скрипта:
```
./start.sh
```

### Локальный запуск через Docker

В корне репозитория есть `docker-compose.yml`, собирающий оба образа и связывающий фронтенд с бэкендом:

```
docker compose up --build
```

После запуска:
- Frontend: http://localhost:8080
- Backend:  http://localhost:4000

## Контейнеризация

Приложение состоит из двух самостоятельных образов:

- `metrics-collector/Dockerfile` — Node.js 20 на базе Debian slim с установленным Chromium для запуска Lighthouse. Слушает порт, заданный переменной `PORT` (8080 в Dockerfile, 4000 в локальном compose).
- `sandbox-app/Dockerfile` — мультистадийная сборка: Node 20 для `npm run build`, затем `nginx:1.27-alpine` для отдачи статики на порту `8080`. URL бэкенда задаётся build-time аргументом `VITE_API_URL` и встраивается в собранный SPA.

## Облачная архитектура

```
                                                            ┌──────────────────────────┐
   Browser ── https ── sandbox-frontend ── https ──┬───────►│ Caddy (LE TLS)           │
                       (YC Serverless Container)   │  TCP/443│   ↓ reverse_proxy       │
                                                   │        │ metrics-backend          │
                                                   │        │   (Express + Lighthouse) │
                                                   ▼        └──────────────────────────┘
                                          backend.<ip>.sslip.io
                                                   ▲
                                                   │
                                          Yandex Compute VM
                                          (Ubuntu 22.04, Docker, docker compose)
```

- **Frontend** — Yandex Serverless Container `sandbox-frontend`, статика на nginx; HTTPS из коробки.
- **Backend** — Yandex Compute VM. На ВМ запущен docker compose стек ([deploy/vm/docker-compose.yml](deploy/vm/docker-compose.yml)) из двух сервисов: Caddy для TLS-терминирования (Let's Encrypt по `<host>.sslip.io`) и `metrics-backend` контейнер из YCR. ВМ авторизуется в YCR по IAM-токену из метадаты (сервисный аккаунт `vm-runner` с ролью `images.puller`); таймер `yc-cr-login.timer` обновляет токен ежечасно. Lighthouse полностью функционален.

## CI/CD

Конвейер описан в [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml) и состоит из трёх джоб:

1. `lint-build` — выполняется на каждый push и pull request: `npm ci`, `npm run lint`, `npm run build` для фронтенда и `node --check server.js` для бэкенда.
2. `deploy-backend` (push в `main`): сборка образа `metrics-backend`, push в Yandex Container Registry, заливка `deploy/vm/docker-compose.yml` и `Caddyfile` на ВМ через scp, затем `docker compose pull && up -d` по SSH.
3. `deploy-frontend` (push в `main`): сборка фронтенда с build-arg `VITE_API_URL=https://${BACKEND_HOSTNAME}` и деплой ревизии Serverless Container.

### Требуемые секреты GitHub Actions

| Секрет | Назначение |
| --- | --- |
| `YC_SA_JSON_CREDENTIALS` | JSON-ключ сервисного аккаунта `gh-deployer` (push в YCR + деплой Serverless Container) |
| `YC_REGISTRY_ID` | ID реестра Yandex Container Registry |
| `YC_FOLDER_ID` | ID каталога в Yandex Cloud |
| `YC_SC_INVOKER_SA_ID` | ID сервисного аккаунта, под которым Serverless Container тянет образы (фронтенд) |
| `VM_HOST` | Внешний IP Compute VM с бэкендом |
| `BACKEND_HOSTNAME` | DNS-имя бэкенда, например `backend.111-88-250-26.sslip.io` (используется и Caddy, и фронтендом) |
| `VM_SSH_PRIVATE_KEY` | Приватный SSH-ключ пользователя `deploy` на ВМ |

### Одноразовая настройка Yandex Cloud

```bash
FOLDER_ID=$(yc config get folder-id)

# 1. Сервисные аккаунты
yc iam service-account create --name gh-deployer
yc iam service-account create --name sc-invoker
yc iam service-account create --name vm-runner
GH_SA_ID=$(yc iam service-account get --name gh-deployer --format json | jq -r .id)
SC_SA_ID=$(yc iam service-account get --name sc-invoker --format json | jq -r .id)
VM_SA_ID=$(yc iam service-account get --name vm-runner --format json | jq -r .id)

# Роли
for r in container-registry.images.pusher serverless.containers.editor iam.serviceAccounts.user; do
  yc resource-manager folder add-access-binding "$FOLDER_ID" \
    --role $r --subject serviceAccount:$GH_SA_ID
done
yc resource-manager folder add-access-binding "$FOLDER_ID" \
  --role container-registry.images.puller --subject serviceAccount:$SC_SA_ID
yc resource-manager folder add-access-binding "$FOLDER_ID" \
  --role container-registry.images.puller --subject serviceAccount:$VM_SA_ID

# JSON-ключ для GitHub
yc iam key create --service-account-name gh-deployer -o key.json

# 2. Container Registry
yc container registry create --name web-metrics-sandbox

# 3. Frontend Serverless Container
yc serverless container create --name sandbox-frontend
yc serverless container allow-unauthenticated-invoke sandbox-frontend

# 4. Compute VM с cloud-init (см. deploy/vm/cloud-init.yaml в репозитории)
ssh-keygen -t ed25519 -N "" -C "github-actions-deploy" -f ~/.ssh/web-metrics-vm
# Подставь публичный ключ в cloud-init и создай ВМ:
yc compute instance create \
  --name metrics-backend-vm \
  --zone ru-central1-a \
  --platform standard-v3 \
  --cores 2 --memory 2GB --core-fraction 100 \
  --create-boot-disk image-folder-id=standard-images,image-family=ubuntu-2204-lts,size=20GB,type=network-ssd \
  --network-interface subnet-id=<your-subnet>,nat-ip-version=ipv4 \
  --service-account-id $VM_SA_ID \
  --metadata-from-file user-data=deploy/vm/cloud-init.yaml
```

## Практическая значимость

Разработанная платформа предлагает методику агрегированного анализа характеристик веб-приложений и сбор метрик по нескольким направлениям в едином формате. Система позволяет повторять эксперименты при изменении конфигурации, версии приложения или внешних условий, а также выявлять компромиссы между оптимизацией, производительностью и доступностью.

Платформа может использоваться для исследовательских задач в области анализа качества no-code и low-code решений и сравнительного анализа альтернативных платформ визуального программирования.