import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle, CircleNotch, PencilSimple, ShieldCheck, WarningCircle } from '@phosphor-icons/react';
import Modal from './Modal';
import './wizard.css';

/** The TourFlow wizard structure, adapted to the Prospecção Brasil design system. */
export default function FormWizard({
  steps = [], title, subtitle, icon: Icon, onClose, onSubmit,
  finishLabel = 'Salvar', loading = false, submitting = false, error = '',
}) {
  const id = useId();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [errorSteps, setErrorSteps] = useState([]);
  const [stepMessage, setStepMessage] = useState('');
  const sections = useRef([]);
  const body = useRef(null);
  const invalidField = useRef(null);
  const submitLock = useRef(false);
  const [finishing, setFinishing] = useState(false);
  const busy = submitting || finishing;
  const disabled = loading || busy;
  const isLast = currentStep === steps.length - 1;

  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
    if (invalidField.current) {
      const field = invalidField.current;
      invalidField.current = null;
      field.focus();
      field.reportValidity();
    }
  }, [currentStep, stepMessage]);

  function validate(indices) {
    const failures = [];
    let firstField;
    indices.forEach(index => {
      const inputs = Array.from(sections.current[index]?.querySelectorAll('input, select, textarea') || []);
      const invalid = inputs.find(input => input.willValidate && !input.checkValidity());
      if (invalid) {
        failures.push(index);
        firstField ||= invalid;
      }
    });
    setErrorSteps(previous => [...previous.filter(index => !indices.includes(index)), ...failures]);
    if (failures.length) {
      invalidField.current = firstField;
      setCurrentStep(failures[0]);
      setStepMessage('Confira os campos destacados para continuar.');
      // When the same step is already visible, no React effect is needed to focus it.
      if (failures[0] === currentStep) {
        firstField.focus();
        firstField.reportValidity();
        invalidField.current = null;
      }
      return false;
    }
    setStepMessage('');
    setCompletedSteps(previous => [...new Set([...previous, ...indices])]);
    return true;
  }

  function goToStep(index) {
    if (disabled || index === currentStep) return;
    if (index > currentStep && !validate(Array.from({ length: index }, (_, i) => i))) return;
    setStepMessage('');
    setCurrentStep(index);
  }

  async function finish() {
    if (disabled || submitLock.current || !isLast) return;
    if (!validate(steps.map((_, index) => index))) return;
    submitLock.current = true;
    setFinishing(true);
    try {
      await onSubmit?.();
    } catch (cause) {
      setStepMessage(cause.message || 'Não foi possível salvar. Tente novamente.');
    } finally {
      submitLock.current = false;
      setFinishing(false);
    }
  }

  return (
    <Modal open wide onClose={busy ? undefined : onClose}>
      <form className="wz-root" noValidate aria-label={title} aria-busy={disabled}
        onSubmit={event => { event.preventDefault(); if (isLast) finish(); }}
        onKeyDown={event => {
          if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA' && event.target.tagName !== 'BUTTON') event.preventDefault();
        }}>
        <div className="wz-layout">
          <aside className="wz-sidebar">
            <div className="wz-sidebar-header">
              {Icon && <span className="wz-sidebar-icon"><Icon size={22} weight="duotone" /></span>}
              <div><h2 className="wz-sidebar-title">{title}</h2><p className="wz-sidebar-subtitle">{subtitle}</p></div>
            </div>
            <nav className="wz-progress" aria-label="Etapas do formulário">
              <ol className="wz-progress-list">
                {steps.map((step, index) => (
                  <li key={step.id || index} className={`wz-progress-item ${currentStep === index ? 'is-active' : ''} ${completedSteps.includes(index) ? 'is-completed' : ''} ${errorSteps.includes(index) ? 'has-error' : ''}`}>
                    <button className="wz-progress-trigger" type="button" disabled={disabled} onClick={() => goToStep(index)} aria-current={currentStep === index ? 'step' : undefined}>
                      <span className="wz-progress-number">{errorSteps.includes(index) ? <WarningCircle size={16} weight="bold" /> : completedSteps.includes(index) && currentStep !== index ? <Check size={14} weight="bold" /> : index + 1}</span>
                      <span className="wz-progress-text"><span className="wz-progress-title">{step.title}</span><span className="wz-progress-subtitle">{step.subtitle}</span></span>
                    </button>
                    {index < steps.length - 1 && <span className="wz-progress-connector" />}
                  </li>
                ))}
              </ol>
            </nav>
            <div className="wz-sidebar-note"><ShieldCheck size={20} /><p>Uma base organizada.<br /><strong>Melhores oportunidades.</strong></p></div>
          </aside>

          <div className="wz-main">
            {(stepMessage || error) && <div className="wz-error" role="alert"><WarningCircle size={20} />{stepMessage || error}</div>}
            <div className="wz-body" ref={body}>
              {loading && <div className="wz-loading" role="status"><CircleNotch size={24} className="wz-spinner" />Carregando informações…</div>}
              <fieldset className="wz-fieldset" disabled={disabled}>
                {steps.map((step, index) => (
                  <section key={step.id || index} ref={element => { sections.current[index] = element; }} className="wz-step-content" hidden={currentStep !== index || loading} aria-labelledby={`${id}-step-${index}`}>
                    <header className="wz-content-header">
                      <span className="wz-eyebrow">ETAPA {String(index + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</span>
                      <h2 id={`${id}-step-${index}`}>{step.heading || step.title}</h2>
                      {step.description && <p>{step.description}</p>}
                    </header>
                    {typeof step.content === 'function' ? step.content({ goToStep }) : step.content}
                  </section>
                ))}
              </fieldset>
            </div>
            <footer className="wz-footer">
              <div className="wz-footer-left">
                <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
                {currentStep > 0 && <button type="button" className="btn btn-outline" onClick={() => goToStep(currentStep - 1)} disabled={disabled}><ArrowLeft size={16} />Voltar</button>}
              </div>
              <div className="wz-footer-right">
                <span className="wz-step-indicator" aria-live="polite">{currentStep + 1} de {steps.length}</span>
                {isLast
                  ? <button type="button" className="btn btn-primary" disabled={disabled} onClick={finish}>{busy ? <CircleNotch size={18} className="wz-spinner" /> : <Check size={18} />}{busy ? 'Salvando…' : finishLabel}</button>
                  : <button type="button" className="btn btn-primary" disabled={disabled} onClick={() => goToStep(currentStep + 1)}>Próximo<ArrowRight size={17} /></button>}
              </div>
            </footer>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function WizardReview({ title, description, sections, onEdit }) {
  return <div className="wz-review">
    <div className="wz-review-banner"><CheckCircle size={28} weight="duotone" /><div><strong>{title}</strong><p>{description}</p></div></div>
    {sections.map((section, index) => <section className="wz-review-section" key={section.title}>
      <div className="wz-review-heading"><h3>{section.title}</h3><button className="wz-edit" type="button" onClick={() => onEdit(index)} aria-label={`Editar ${section.title}`}><PencilSimple size={14} />Editar</button></div>
      <dl>{section.items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value !== '' && value != null ? value : 'Não informado'}</dd></div>)}</dl>
    </section>)}
  </div>;
}
