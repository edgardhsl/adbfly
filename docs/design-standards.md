# ADB Fly Design Standards

## Objetivo
Este documento define o padrao visual e de UX da interface do ADB Fly para manter consistencia, qualidade e escalabilidade.

## 1) Identidade do produto
- O ADB Fly deve parecer uma ferramenta desktop tecnica, robusta e premium.
- Evitar visual de CRUD antigo ou dashboard generico.
- O foco e produtividade, legibilidade e hierarquia clara.

## 2) Stack e implementacao
- React + Tailwind CSS + shadcn/ui + lucide-react + `cn`.
- Preferir componentes reais do shadcn/ui quando houver equivalente.
- Manter estrutura componentizada, sem excesso de `div` generica.

## 3) Layout estrutural
- Aplicacao full screen: `h-screen w-screen`.
- Estrutura base: `sidebar` fixa + `main` ocupando o restante.
- Sem card centralizado de mockup para envolver toda a aplicacao.

## 4) Sidebar
- Sidebar com cor unica e clara, sem degrade.
- Aparencia glassmorphism sutil: translucidez alta (quase solida), blur leve e borda suave.
- Deve conter:
  - branding (icone + nome + subtitulo tecnico)
  - resumo do device (texto + status + badges, sem card grande)
  - secao "Selected app"
  - busca lateral
  - navegacao agrupada: `Device`, `Selected App`, `Operations`
- A arvore de banco/tabelas deve aparecer somente quando a view ativa for `Databases`.

## 5) Main background
- O fundo do `main` deve ser azul escuro com degrade "midnight".
- Padrao esperado:
  - camada inclinada escura saindo da borda da sidebar
  - camada radial + degrade profundo na direita
- Referencia de tons:
  - `#050816`
  - `#081121`
  - `#091326`

## 6) Header e contraste
- Header com overlay/gradiente para garantir contraste em qualquer fundo.
- Breadcrumb tecnico legivel: `device > package > database > recurso`.
- Item ativo com destaque em primario (`indigo/violet`).
- Controles compactos no topo: status, idioma e tema.

## 7) Overview x Databases
- `Overview` aparece apenas em modo overview.
- `Databases` remove distracoes e foca em:
  - topbar contextual
  - toolbar de filtros/acoes
  - tabela principal
  - arvore de banco na sidebar

## 8) Toolbar e tabela (modo Databases)
- Toolbar com `Input`, `Select`, `Button`, separando acao primaria e secundaria.
- Tabela como area dominante visual.
- Cabecalho elegante, linhas espacadas, hover suave e tipografia tecnica.
- Booleanos devem usar `Checkbox` (shadcn/ui).

## 9) Cor e paleta
- Base neutra: `slate`/`zinc`.
- Primaria: `indigo`/`violet` (ex.: `#6366f1`, `#5b5cf6`, `#7c3aed`).
- Status positivo: `#4ade80`.
- Evitar saturacao excessiva e dark pastel lavado.

## 10) Tipografia
- Fonte principal global: JetBrains Mono.
- Escala visual compacta e legivel (faixa alvo: 12px a 14px, com hierarquia controlada).
- Em cards claros (ex.: `bg-white/90`), usar texto escuro para contraste adequado.

## 11) Glassmorphism (regras)
- Usar com moderacao.
- Priorizar legibilidade sobre efeito.
- Nao exagerar em transparencia e blur.
- Transparencia existe para profundidade, nao para decoracao gratuita.

## 12) Componentes obrigatorios (quando aplicavel)
- `Button`
- `Card`
- `Input`
- `Select`
- `Checkbox`
- `Badge`
- `Separator`
- `ScrollArea`
- `Tabs`

## 13) Criterios de aceitacao de UI
- Contraste legivel em todos os blocos importantes.
- Sidebar consistente (sem degrade) e main com degrade midnight conforme padrao.
- View de banco focada e sem ruido de overview.
- Responsividade desktop-first sem quebra ruim de toolbar.
- Sem regressao funcional de fluxos existentes.
