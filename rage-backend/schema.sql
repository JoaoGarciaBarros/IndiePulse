-- ================================================================
-- RAGETRIGGER — banco de dados
-- Cole isso no SQL Editor do Supabase e clique em Run.
-- ================================================================


-- Precisamos dessa extensão pra gerar IDs únicos automaticamente.
create extension if not exists "uuid-ossp";




-- ================================================================
-- GRUPOS DE INCIDENTES
--
-- Quando vários jogadores reportam o mesmo bug, eles caem no mesmo
-- "grupo" em vez de criar centenas de linhas idênticas.
-- Isso é a deduplicação.
-- ================================================================

create table if not exists incident_groups (
  id               uuid primary key default uuid_generate_v4(),

  -- Hash do erro. Mesma fingerprint = mesmo grupo.
  fingerprint      text not null unique,

  category         text not null,

  -- Título gerado automaticamente a partir do primeiro erro.
  title            text not null,

  -- Quantas vezes esse problema aconteceu?
  occurrence_count integer not null default 1,

  first_seen       timestamptz not null default now(),
  last_seen        timestamptz not null default now()
);




-- ================================================================
-- INCIDENTES
--
-- Cada vez que um jogador aperta o botão de Rage, cria uma linha
-- aqui com tudo que o frontend capturou naquele momento.
-- ================================================================

create table if not exists incidents (
  id           uuid primary key default uuid_generate_v4(),

  -- Quando o jogador apertou o botão (horário do cliente).
  timestamp    timestamptz not null,

  -- Identificação da sessão e do jogador.
  session_id   text not null,
  user_id      text,       -- pode ser nulo se o jogador não estiver logado
  page         text,       -- qual tela do jogo estava aberta

  -- O que aconteceu?
  category     text not null check (category in (
                 'bug', 'lag', 'frustration', 'exploit',
                 'ui_ux', 'performance', 'other'
               )),
  comment      text,       -- comentário livre do jogador (opcional)

  -- Status do time de suporte.
  status       text not null default 'open' check (status in (
                 'open',          -- recém chegou, ninguém viu ainda
                 'investigating', -- alguém está olhando
                 'resolved'       -- resolvido
               )),

  -- Qual a gravidade do problema?
  severity     text not null default 'medium' check (severity in (
                 'low', 'medium', 'high', 'critical'
               )),

  -- Caminhos para os arquivos de evidência salvos no servidor.
  screenshot_path  text,   -- /storage/incidents/{id}/screenshot.png
  replay_path      text,   -- /storage/incidents/{id}/replay.mp4

  -- Payloads completos vindos do frontend, guardados como JSON.
  logs_json        jsonb,  -- array de { level, message, timestamp }
  metrics_json     jsonb,  -- fps, ping, memória, browser, etc
  metadata_json    jsonb,  -- versão do jogo, build, etc

  -- Três colunas numéricas separadas pra facilitar filtros e gráficos
  -- (evita ter que mergulhar no JSON em toda query).
  fps          float,
  ping_ms      float,
  js_heap_mb   float,

  -- Liga esse incidente ao grupo de duplicatas.
  fingerprint  text,
  group_id     uuid references incident_groups(id) on delete set null,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);




-- ================================================================
-- REGISTRO DE WEBHOOKS
--
-- Toda vez que o sistema manda um alerta pro Discord ou Slack,
-- guarda aqui. Serve pra evitar spam (cooldown por categoria).
-- ================================================================

create table if not exists webhook_logs (
  id           bigserial primary key,
  incident_id  uuid not null,
  category     text not null,
  target       text not null,   -- "discord", "slack" ou "generic"
  success      boolean not null default true,
  error_msg    text,             -- guarda o erro se o envio falhou
  sent_at      timestamptz not null default now()
);




-- ================================================================
-- ÍNDICES
--
-- Sem isso as queries ficam lentas quando tiver muitos incidentes.
-- ================================================================

create index if not exists idx_incidents_category    on incidents (category);
create index if not exists idx_incidents_status      on incidents (status);
create index if not exists idx_incidents_severity    on incidents (severity);
create index if not exists idx_incidents_user_id     on incidents (user_id);
create index if not exists idx_incidents_session_id  on incidents (session_id);
create index if not exists idx_incidents_group_id    on incidents (group_id);
create index if not exists idx_incidents_fingerprint on incidents (fingerprint);
create index if not exists idx_incidents_created_at  on incidents (created_at desc);

create index if not exists idx_groups_fingerprint on incident_groups (fingerprint);
create index if not exists idx_groups_last_seen   on incident_groups (last_seen desc);

create index if not exists idx_webhooks_category on webhook_logs (category, sent_at desc);

-- Busca dentro do JSON de logs (ex: buscar por mensagem de erro específica)
create index if not exists idx_incidents_logs_gin on incidents using gin (logs_json);




-- ================================================================
-- ATUALIZAÇÃO AUTOMÁTICA DO updated_at
--
-- Toda vez que um incidente for editado (ex: status mudou pra
-- "resolved"), o campo updated_at atualiza sozinho.
-- ================================================================

create or replace function atualizar_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_incidents_updated_at
  before update on incidents
  for each row
  execute function atualizar_updated_at();




-- ================================================================
-- VIEWS PRONTAS PARA O DASHBOARD
-- ================================================================

-- Números gerais (total, abertos, críticos, fps médio)
create or replace view resumo_geral as
select
  count(*)                                            as total_incidents,
  count(*) filter (where status = 'open')             as abertos,
  count(*) filter (where status = 'investigating')    as em_investigacao,
  count(*) filter (where status = 'resolved')         as resolvidos,
  count(*) filter (where severity = 'critical')       as criticos,
  round(avg(fps)::numeric, 1)                         as fps_medio,
  round(avg(ping_ms)::numeric, 1)                     as ping_medio_ms
from incidents;


-- Quantos reports por categoria
create or replace view reports_por_categoria as
select
  category,
  count(*)                                        as total,
  count(*) filter (where status = 'open')         as abertos,
  count(*) filter (where severity = 'critical')   as criticos,
  round(avg(fps)::numeric, 1)                     as fps_medio,
  max(created_at)                                 as ultimo_report
from incidents
group by category
order by total desc;


-- Top grupos com mais ocorrências (bugs mais recorrentes)
create or replace view bugs_mais_frequentes as
select
  g.id,
  g.title,
  g.category,
  g.occurrence_count,
  g.first_seen,
  g.last_seen,
  g.last_seen - g.first_seen as duracao
from incident_groups g
order by g.occurrence_count desc;
