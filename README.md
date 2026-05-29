# G3_Divide_&_Conquer

**Conteúdo da Disciplina**: Dividir e Conquistar

## Sobre
O **GP Chaos Index** é um simulador de corrida inspirado em Fórmula 1 que usa **Contagem de Inversões** para medir o quanto a ordem de chegada mudou em relação à ordem de largada.

A proposta é comparar duas listas:

```text
Largada:  VER, NOR, LEC, HAM...
Chegada:  NOR, HAM, VER, LEC...
```

Cada inversão representa um par de pilotos cuja ordem relativa mudou. Quanto maior o número de inversões, maior o **índice de caos** da corrida.

## Algoritmo
A contagem de inversões foi implementada com a mesma lógica do **Merge Sort**:

1. Divide a lista em duas metades.
2. Conta inversões na metade esquerda.
3. Conta inversões na metade direita.
4. Conta inversões cruzadas durante o merge.

Complexidade:

```text
O(n log n)
```

## Ideia do Simulador
O projeto usa apenas pilotos de quatro equipes:

* McLaren
* Ferrari
* Mercedes
* Red Bull

Cada GP possui:

* chance própria de chuva;
* vantagem específica para algumas equipes;
* nível base de caos;
* comportamento diferente quando chove.

Quando a chuva acontece, o caos aumenta bastante e a vantagem passa a favorecer pilotos com maior habilidade de chuva e experiência.

## Funcionalidades
* Simulação de diferentes GPs.
* Ordem de largada gerada por desempenho de classificação.
* Ordem de chegada simulada por pista, equipe, chuva e caos.
* Índice de caos baseado em contagem de inversões.
* Visualização da largada e chegada lado a lado.
* Destaque de posições ganhas e perdidas.
* Exibição dos passos do Merge Count.
* Testes simples para validar a contagem de inversões.

## Instalação
**Linguagem**: `JavaScript`<br>
**Framework**: `Nenhum`<br>

Não há dependências externas.

## Uso
Abra o arquivo `index.html` no navegador.

Também é possível servir a pasta localmente:

```bash
python -m http.server 8000
```

Depois acesse:

```text
http://localhost:8000
```

## Testes
Para executar os testes:

```bash
npm test
```

## Fonte dos pilotos
Os pilotos usados no simulador foram baseados na página oficial de equipes da Fórmula 1 para a temporada 2026: https://www.formula1.com/en/teams

## Estrutura
```text
.
├── index.html
├── package.json
├── README.md
├── src
│   ├── app.js
│   ├── data.js
│   ├── inversions.js
│   └── styles.css
└── tests
    └── inversions.test.mjs
```
