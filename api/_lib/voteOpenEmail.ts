/**
 * "Vote ouvert" email to a team member (escaped values only). Shared by
 * /api/send-match-notification and the scheduled matches cron.
 */
export function renderVoteOpenEmail({ safeLabel, safeOrgName, voteUrl, unsubscribe, appUrl }: {
  safeLabel: string; safeOrgName: string; voteUrl: string; unsubscribe: string; appUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000;font-family:system-ui,-apple-system,sans-serif;color:#fff">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;padding:32px 24px">
    <tr><td>
      <p style="font-size:22px;font-weight:800;letter-spacing:-0.5px;margin:0 0 4px">
        <span style="color:#FFD700">Pépite</span> &amp; <span style="color:#aadd00">Citron</span>
      </p>
      <p style="font-size:13px;color:rgba(235,235,245,0.6);margin:0 0 32px">${safeOrgName}</p>

      <p style="font-size:18px;font-weight:700;margin:0 0 8px">⭐ Vote ouvert !</p>
      <p style="font-size:15px;color:rgba(235,235,245,0.75);margin:0 0 24px;line-height:1.5">
        Un vote a été lancé pour <strong style="color:#fff">${safeLabel}</strong>.
        Désigne la pépite et le citron de ce match !
      </p>

      <a href="${voteUrl}"
         style="display:inline-block;background:#FFD700;color:#000;font-size:15px;font-weight:700;
                padding:14px 28px;border-radius:12px;text-decoration:none;margin-bottom:24px">
        Voter maintenant →
      </a>

      <p style="font-size:12px;color:rgba(235,235,245,0.5);margin:24px 0 0;line-height:1.6">
        Tu reçois cet email parce que tu es membre de l'équipe ${safeOrgName} sur Pépite &amp; Citron.<br>
        <a href="${unsubscribe}" style="color:rgba(235,235,245,0.7)">Ne plus recevoir ces emails</a>
        · <a href="${appUrl}/profile" style="color:rgba(235,235,245,0.7)">Gérer mes emails</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}
