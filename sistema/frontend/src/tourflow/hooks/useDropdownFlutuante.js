/**
 * Hook compartilhado para dropdowns/menus flutuantes (position: fixed).
 *
 * Resolve os bugs recorrentes dos menus de ações e comboboxes:
 * - Não fecha ao dar scroll dentro do próprio menu (scroll capture no window
 *   disparava `setAberto(false)` mesmo quando o alvo era o dropdown).
 * - Não fecha ao clicar dentro do menu (mousedown fora + menu em portal).
 * - Reposiciona junto ao gatilho quando a página rola (em vez de fechar).
 * - Fecha apenas quando o gatilho sai da viewport (scroll longo).
 * - Flip para cima ancora pela base do menu (sem vão absurdo).
 *
 * Uso:
 *   const { aberto, setAberto, posicao, estiloMenu, triggerRef, menuRef } = useDropdownFlutuante({ menuWidth: 208 });
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { computeDropdownPosition, dropdownPortalStyle } from '../utils/dropdownPosition';

export function useDropdownFlutuante({
  menuWidth = null,
  minWidth = 0,
  maxHeight = 400,
  gap = 4,
  /** fecha quando o gatilho some da viewport (padrão: true) */
  fecharQuandoSairDaViewport = true,
} = {}) {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const atualizarPosicao = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosicao(computeDropdownPosition({ rect, menuWidth, minWidth, maxHeight, gap }));
  }, [menuWidth, minWidth, maxHeight, gap]);

  function alternar() {
    if (!aberto) atualizarPosicao();
    setAberto((a) => !a);
  }

  function fechar() {
    setAberto(false);
  }

  // Fecha ao clicar fora (trigger ou menu em portal não fecham).
  useEffect(() => {
    if (!aberto) return undefined;
    function onMouseDown(e) {
      const t = e.target;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setAberto(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [aberto]);

  // Reposiciona no scroll/resize — sem fechar quando o scroll é dentro do menu.
  useEffect(() => {
    if (!aberto) return undefined;
    function onScroll(e) {
      // Scroll dentro do próprio menu: não reage.
      if (menuRef.current && e?.target && menuRef.current.contains(e.target)) return;
      atualizarPosicao();
      if (fecharQuandoSairDaViewport && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const foraDaTela = rect.bottom < 0 || rect.top > window.innerHeight;
        if (foraDaTela) setAberto(false);
      }
    }
    function onResize() {
      atualizarPosicao();
    }
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [aberto, atualizarPosicao, fecharQuandoSairDaViewport]);

  const estiloMenu = posicao
    ? dropdownPortalStyle(posicao, { overflowY: 'auto' })
    : null;

  return {
    aberto,
    setAberto,
    posicao,
    estiloMenu,
    triggerRef,
    menuRef,
    alternar,
    fechar,
    atualizarPosicao,
  };
}

export default useDropdownFlutuante;
