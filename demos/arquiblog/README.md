# ArquiBlog para GitHub Pages

Esta pasta contem uma versao estatica do app para publicar no GitHub Pages.

## Como publicar

1. Suba a pasta `arquiblog` para o repositorio.
2. No GitHub, acesse `Settings > Pages`.
3. Selecione a branch desejada e publique a partir da raiz do repositorio.
4. Acesse a pagina em `/arquiblog/`.

Tambem e possivel mover os arquivos desta pasta para a raiz do branch usado pelo Pages.

## Configuracao

Abra a aba `Configuracao` no app e preencha:

- `OpenAI API Key`
- modelo de analise da imagem
- modelo de geracao do texto
- dados editoriais do escritorio

Essas informacoes ficam salvas no `localStorage` do navegador. Elas nao sao gravadas no repositorio.

## Aviso de seguranca

Como o GitHub Pages nao roda backend, a chamada para a OpenAI acontece diretamente no navegador. Isso facilita a publicacao estatica, mas nao e o modelo mais seguro para uma pagina publica, porque a chave fica disponivel no dispositivo de quem a informar.

Para uso aberto ao publico, prefira um backend/proxy com autenticacao.
