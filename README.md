# Pixel Blackjack 21

Jogo de cartas com visual retrô em pixel art, feito com HTML, CSS e JavaScript. Inclui Blackjack clássico para um jogador e um modo online de Roleta Russa para até cinco jogadores na rede local.

## Sobre o jogo

No **modo solo**, jogue Blackjack contra o crupiê: faça suas apostas e tente chegar o mais perto possível de 21 sem estourar. O jogo oferece opções como comprar ou parar, dobrar, dividir pares e seguro. O saldo fica salvo no navegador.

No **modo online**, os jogadores disputam rodadas de Blackjack para decidir quem escolhe os alvos da Roleta Russa. Cada personagem tem habilidades próprias, e a partida continua até restar um vencedor. É possível adicionar bots para completar a mesa.

As regras completas da Roleta Russa e as habilidades de cada personagem estão em [HABILIDADES.md](HABILIDADES.md).

## Requisitos

- Python 3 (sem dependências externas) para iniciar o servidor diretamente.
- Um navegador moderno.
- Para o modo com Nginx na máquina virtual: Ubuntu ou outra distribuição Linux com `systemd`, Python 3 e Nginx.

## Executar com Python

Na pasta do repositório, execute:

```bash
python3 server.py
```

O servidor escuta por padrão em todas as interfaces, na porta `8080`. Abra `http://127.0.0.1:8080` no próprio computador. Para jogar pela rede local, use o endereço de rede exibido no terminal, por exemplo `http://192.168.1.20:8080`. Os outros jogadores devem estar na mesma rede e acessar esse endereço.

Para escolher outra porta:

```bash
python3 server.py --port 9000
```

Encerre o servidor com `Ctrl+C`. A porta usada precisa estar liberada no firewall. Não é necessário executar Python com `sudo` para usar a porta padrão `8080`.

## Executar em uma VirtualBox com Nginx

O script `ativar.sh` configura o Nginx para servir o jogo na porta `80` e encaminhar as chamadas da API para o servidor Python na porta `8080`. Também cria e inicia o serviço `blackjack-api` pelo `systemd`, configurado para iniciar junto com a máquina.

1. Configure a rede da máquina virtual no VirtualBox:
   - **Placa em modo Bridge** permite que outros dispositivos da mesma rede acessem a VM.
   - **Host-only** permite acesso entre a VM e o computador hospedeiro.
   - Com **NAT**, configure o encaminhamento da porta `80` do hospedeiro para a porta `80` da VM.
2. Na VM Linux, instale os pré-requisitos:

   ```bash
   sudo apt update
   sudo apt install -y python3 nginx
   ```

3. Copie os arquivos do repositório para `/var/www/html`. Por exemplo, se o repositório já estiver na VM, execute a partir da pasta dele:

   ```bash
   sudo cp -a . /var/www/html/
   ```

4. Execute o script:

   ```bash
   sudo bash /var/www/html/ativar.sh
   ```

5. Abra no navegador `http://IP_DA_VM`. O script informa o IP da VM ao terminar. Se necessário, permita tráfego HTTP na porta `80` no firewall da VM.

O script usa a configuração padrão do Nginx e a substitui para publicar este jogo. Para consultar o serviço depois da instalação:

```bash
sudo systemctl status blackjack-api nginx
```

## Estrutura principal

- `index.html`, `style.css`: interface do jogo.
- `game.js`: Blackjack solo.
- `online.js`: interface do modo online.
- `server.py`: servidor HTTP, API da sala e lógica multiplayer.
- `ativar.sh`: configuração de Nginx e do serviço `systemd` para Linux.
- `assets/`: imagens, sprites e sons.
- `HABILIDADES.md`: regras detalhadas e habilidades dos personagens.
