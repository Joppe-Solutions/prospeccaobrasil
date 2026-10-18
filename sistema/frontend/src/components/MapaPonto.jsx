import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from '@phosphor-icons/react';
import { api } from '../lib/api';
import './mapa-ponto.css';

const PIN = L.divIcon({ className: 'mapa-ponto-pin', html: '<span></span>', iconSize: [30, 40], iconAnchor: [15, 40] });
const RIO = [-22.9068, -43.1729];
const fmt = ({ lat, lng }) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

// Mapa do formulário: localiza o endereço digitado e deixa o usuário arrastar o marcador
// (ou clicar no mapa) até a porta do imóvel. O ponto vira as coordenadas do cadastro.
export default function MapaPonto({ form, ponto, onPonto }) {
  const caixa = useRef(null);
  const mapa = useRef(null);
  const marcador = useRef(null);
  const [aviso, setAviso] = useState('');
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    const m = L.map(caixa.current, { scrollWheelZoom: false, attributionControl: true }).setView(ponto ? [ponto.lat, ponto.lon] : RIO, ponto ? 18 : 11);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    m.on('click', (e) => colocar(e.latlng, true));
    mapa.current = m;
    // o passo do formulário começa oculto: recalcula o tamanho quando o mapa aparece
    const obs = new ResizeObserver(() => m.invalidateSize());
    obs.observe(caixa.current);
    return () => { obs.disconnect(); m.remove(); mapa.current = null; marcador.current = null; };
  }, []);

  function colocar(latlng, avisar) {
    const m = mapa.current;
    if (!m) return;
    if (!marcador.current) {
      marcador.current = L.marker(latlng, { icon: PIN, draggable: true, keyboard: false }).addTo(m);
      marcador.current.on('dragend', () => onPonto(fmt(marcador.current.getLatLng())));
    } else marcador.current.setLatLng(latlng);
    if (avisar) { onPonto(fmt(latlng)); setAviso(''); }
  }

  // Coordenadas digitadas/coladas no campo movem o marcador
  useEffect(() => {
    if (!mapa.current || !ponto) return;
    const atual = marcador.current?.getLatLng();
    if (atual && Math.abs(atual.lat - ponto.lat) < 1e-7 && Math.abs(atual.lng - ponto.lon) < 1e-7) return;
    colocar(L.latLng(ponto.lat, ponto.lon), false);
    mapa.current.setView([ponto.lat, ponto.lon], Math.max(mapa.current.getZoom(), 17));
  }, [ponto?.lat, ponto?.lon]);

  async function localizar() {
    setBuscando(true); setAviso('');
    try {
      const q = new URLSearchParams({ endereco: form.endereco || '', numero: form.numero || '', bairro: form.bairro || '', cidade: form.cidade || '', uf: form.uf || '' });
      const geo = await api(`/imoveis/localizar?${q}`);
      const latlng = L.latLng(geo.lat, geo.lon);
      colocar(latlng, true);
      mapa.current.setView(latlng, geo.precisao === 'rua' ? 17 : 18);
      setAviso(geo.precisao === 'rua'
        ? 'O mapa achou só a rua, não o número. Arraste o marcador até a entrada do imóvel.'
        : 'Confira o marcador e, se precisar, arraste até a entrada do imóvel.');
    } catch (e) { setAviso(e.message); } finally { setBuscando(false); }
  }

  return <div className="mapa-ponto">
    <div className="mapa-ponto-barra">
      <button type="button" className="btn btn-outline btn-sm" onClick={localizar} disabled={buscando || !form.endereco || !form.cidade}><MapPin size={15} />{buscando ? 'Localizando...' : 'Localizar endereço no mapa'}</button>
      <small>{aviso || (ponto ? 'Ponto marcado. Arraste o marcador para ajustar.' : 'Clique no mapa para marcar a entrada do imóvel ou localize pelo endereço.')}</small>
    </div>
    <div ref={caixa} className="mapa-ponto-mapa" role="application" aria-label="Mapa para marcar o ponto do imóvel" />
  </div>;
}
