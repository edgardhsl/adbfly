# Escrita SQLite em dispositivos Android — segurança e recuperação

## Escopo e restrições

O ADB Fly manipula cópias de bancos de aplicativos **depuráveis**, acessíveis por `adb exec-in/exec-out run-as`. A escrita substitui um snapshot após interromper o pacote com `am force-stop`. Não utilizar para aplicativos de produção, dados sem backup, bancos acessados por múltiplos processos ou dispositivos sem homologação do fluxo.

**O `am force-stop` interrompe o aplicativo e pode descartar trabalho ainda não persistido.** Verifique a autorização do usuário e mantenha backup antes de qualquer gravação.

## Protocolo aplicado

1. Valida o nome do banco, coleta banco e WAL originais e aplica a mudança em uma cópia local.
2. Exige processo parado, executa checkpoint e `PRAGMA quick_check(1)`.
3. Interrompe o pacote antes do envio, compara novamente banco/WAL remotos com os snapshots originais e aborta em conflito.
4. Envia a cópia pelo stdin do ADB diretamente para um arquivo de staging privado do UID do aplicativo; confirma que os bytes recebidos são idênticos.
5. Antes do commit, repete a interrupção e comparação de origem. Cria marcador `.adbfly-pending`, preserva os arquivos originais por renomeação atômica no mesmo sistema de arquivos (sem cópias parciais), preserva WAL/SHM e verifica o novo banco por leitura de volta.
6. Se falhar após o início da troca, tenta rollback com os backups. Se uma desconexão impedir a recuperação, **preserva os backups e o marcador**, bloqueando novas operações sobre o mesmo banco.

Esta estratégia melhora a recuperação, mas **não cria uma transação SQLite distribuída ou bloqueio obrigatório do pacote Android**. Um aplicativo que reinicie e modifique arquivos simultaneamente, uma falha de energia ou um processo externo podem ainda causar situações não cobertas. Não tratar um CI verde como evidência de recuperação segura em todas as versões Android.

## Diagnóstico de recuperação

Se a operação indicar `RECOVERY REQUIRED` ou houver `*.adbfly-pending`:

- Não reinicie o app nem tente outra gravação no mesmo banco.
- Não remova o marcador nem `*.adbfly-backup` sem conferir o estado dos arquivos e a integridade do backup.
- Faça uma cópia forense/externa dos arquivos de banco, WAL, SHM e backups por `run-as` antes de qualquer intervenção.
- Restaure o conjunto consistente de arquivos com auxílio de um responsável pelo banco e execute `PRAGMA integrity_check` na cópia restaurada antes de liberar a aplicação.
- Registre versão Android, versão do aplicativo, modelo do dispositivo, SHA do banco original e ponto de falha do ADB.

## Verificação do protocolo sem dispositivo

Uma simulação local com falhas injetadas em quatro comandos de renomeação confirmou a restauração dos bytes de DB/WAL/SHM e a permanência do marcador de recuperação em caso de interrupção. **Esta é apenas uma simulação do protocolo de arquivos**: não executa `adb run-as`, não reproduz concorrência de processos Android nem valida durabilidade após queda de energia.

## Testes de homologação obrigatórios

- [ ] Banco SQLite em modo DELETE e WAL; SQLCipher quando a feature estiver habilitada
- [ ] Escrita de 1 e N linhas, encerramento forçado antes e durante o staging
- [ ] App iniciado antes do primeiro check, entre os checks e durante a troca
- [ ] Desconexão/corte de ADB durante staging, criação de backup, troca, verificação e limpeza
- [ ] Disco cheio e negação de permissões sob `run-as`
- [ ] Recuperação a partir de `.adbfly-pending`, inclusive perda do canal ADB
- [ ] Nenhum arquivo temporário legível fora do sandbox do aplicativo
- [ ] `integrity_check` após commit e rollback; conteúdo original restaurado byte a byte
- [ ] Validação em Android mínimo suportado e em pelo menos um dispositivo físico

Enquanto esta matriz não passar, manter o PR como **draft** e não habilitar escrita em produção.
