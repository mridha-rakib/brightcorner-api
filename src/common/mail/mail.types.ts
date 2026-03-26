export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type MailProvider = {
  send: (message: MailMessage) => Promise<void>;
};
