const net = require('node:net');
const { spawn } = require('node:child_process');

const host = '127.0.0.1';
const smtpPort = 1025;
const webPort = 1080;

const canConnectToPort = (port) =>
  new Promise((resolve) => {
    let settled = false;
    const socket = net.createConnection({ host, port });

    const finish = (result) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(500);
    socket.on('connect', () => finish(true));
    socket.on('timeout', () => finish(false));
    socket.on('error', () => finish(false));
  });

let mailDevBin;

try {
  mailDevBin = require.resolve('maildev/bin/maildev');
} catch (error) {
  console.error(`Failed to resolve MailDev CLI: ${error.message}`);
  process.exit(1);
}

const startMailDev = async () => {
  const [smtpInUse, webInUse] = await Promise.all([canConnectToPort(smtpPort), canConnectToPort(webPort)]);

  if (smtpInUse && webInUse) {
    console.log(`MailDev already running at http://localhost:${webPort}`);
    return;
  }

  if (smtpInUse || webInUse) {
    const busyPort = smtpInUse ? smtpPort : webPort;
    console.error(
      `MailDev could not start because port ${busyPort} is already in use. Stop the conflicting process or start MailDev manually.`
    );
    process.exit(1);
  }

  const child = spawn(process.execPath, [mailDevBin, '--smtp', String(smtpPort), '--web', String(webPort)], {
    stdio: 'inherit',
  });

  const shutdown = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  child.on('error', (error) => {
    console.error(`Failed to start MailDev: ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
};

startMailDev();