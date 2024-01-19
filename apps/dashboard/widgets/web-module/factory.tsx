import WebChatBubble from './web-components/chatbubble';
import { hookFunctionsToWindow } from './utils';

export const initChatBubble = async (props: {
  agentId?: string;
  onMarkedAsResolved?(): any;
}) => {
  const currentScriptSrc = (document?.currentScript as any)?.src;

  const urlObj = new URL(currentScriptSrc || '');

  const agentId = urlObj?.searchParams?.get('agentId');

  hookFunctionsToWindow(props);
  const webChatBubble = new WebChatBubble();

  webChatBubble.setAttribute('agent-id', agentId || props?.agentId || '');

  props?.onMarkedAsResolved &&
    webChatBubble.setAttribute(
      'on-marked-as-resolved',
      props?.onMarkedAsResolved.name
    );

  document?.body?.appendChild(webChatBubble);
};

export const generateFactory = () => ({
  initChatBubble,
});

// TODO: used to overcome the issue of module has no default export, directly use ChaindeskFactory when issue solved.
export const injectFactoryInWindow = (factory: any) => {
  if (typeof window === 'undefined') return;
  window.ChaindeskFactory = { ...factory };
};
