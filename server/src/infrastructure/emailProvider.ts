import fs from 'fs';
import path from 'path';

export class EmailProvider {
  private static emailLogPath = path.join(__dirname, '../../logs/emails.log');

  public static async sendEmail(to: string, subject: string, body: string): Promise<void> {
    const logDir = path.dirname(EmailProvider.emailLogPath);
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const emailLog = `
=== Email Sent at ${timestamp} ===
To: ${to}
Subject: ${subject}
Body:
${body}
=====================================

`;

    fs.appendFileSync(EmailProvider.emailLogPath, emailLog);
    
    // Simulate async email sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  public static async sendWelcomeEmail(email: string, username: string): Promise<void> {
    const subject = 'Welcome to Splendor!';
    const body = `Hi ${username},\n\nWelcome to Splendor! Your account has been created successfully.\n\nEnjoy the game!\n\nThe Splendor Team`;
    await EmailProvider.sendEmail(email, subject, body);
  }

  public static async sendGameInviteEmail(email: string, inviterName: string, lobbyId: string): Promise<void> {
    const subject = `${inviterName} invited you to play Splendor!`;
    const body = `Hi,\n\n${inviterName} has invited you to join a game of Splendor!\n\nLobby ID: ${lobbyId}\n\nJoin now and enjoy the game!\n\nThe Splendor Team`;
    await EmailProvider.sendEmail(email, subject, body);
  }

  public static async sendTurnReminderEmail(email: string, gameId: string): Promise<void> {
    const subject = 'Your turn in Splendor!';
    const body = `Hi,\n\nIt's your turn in Splendor!\n\nGame ID: ${gameId}\n\nDon't keep your opponents waiting!\n\nThe Splendor Team`;
    await EmailProvider.sendEmail(email, subject, body);
  }
}
