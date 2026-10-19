import net from 'node:net';

// Os hosts externos (Neon, OpenRouter, Resend) têm vários IPs (IPv4 e IPv6). Ao conectar, o Node
// tenta cada IP por só 250 ms ("happy eyeballs"); em redes com latência alta isso falha com
// ETIMEDOUT mesmo com o serviço no ar. Com 2 s por tentativa, as conexões passam.
// Vale para o processo inteiro (pg e fetch); importar este arquivo mais de uma vez não tem efeito extra.
net.setDefaultAutoSelectFamilyAttemptTimeout(2000);
