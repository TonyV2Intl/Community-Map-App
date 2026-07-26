export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  return Response.redirect(`${url.origin}/m/default`, 302);
}
