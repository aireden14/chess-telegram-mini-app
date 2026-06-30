import React, { useState, useEffect } from 'react';

export const ReaderScreen = () => {
  const [text, setText] = useState<string>('');
  const [title, setTitle] = useState<string>('Читалка');

  useEffect(() => {
    const savedText = localStorage.getItem('reader_text');
    const savedTitle = localStorage.getItem('reader_title');
    if (savedText) setText(savedText);
    if (savedTitle) setTitle(savedTitle);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setText(content);
      setTitle(file.name);
      localStorage.setItem('reader_text', content);
      localStorage.setItem('reader_title', file.name);
    };
    reader.readAsText(file);
  };

  const clearBook = () => {
    setText('');
    setTitle('Читалка');
    localStorage.removeItem('reader_text');
    localStorage.removeItem('reader_title');
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      backgroundColor: 'var(--tg-theme-bg-color, #ffffff)',
      color: 'var(--tg-theme-text-color, #000000)',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        padding: '16px',
        backgroundColor: 'var(--tg-theme-secondary-bg-color, #f4f4f5)',
        borderBottom: '1px solid var(--tg-theme-hint-color, #e4e4e7)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>{title}</h1>
        {text && <button onClick={clearBook} style={{background:'transparent', border:'none', color:'var(--tg-theme-button-color, #2481cc)'}}>Закрыть книгу</button>}
      </div>
      
      {text ? (
        <div style={{
          flex: 1, overflowY: 'auto', padding: '24px', fontSize: '18px', lineHeight: 1.6, whiteSpace: 'pre-wrap'
        }}>{text}</div>
      ) : (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px', textAlign: 'center'
        }}>
          <div style={{fontSize: 48, marginBottom: 16}}>📚</div>
          <h2>Добро пожаловать в Читалку</h2>
          <p style={{color: 'var(--tg-theme-hint-color, #999)'}}>Загрузите файл формата .txt, чтобы начать чтение</p>
          <label style={{
            backgroundColor: 'var(--tg-theme-button-color, #2481cc)',
            color: 'var(--tg-theme-button-text-color, #ffffff)',
            padding: '12px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '16px'
          }}>
            Загрузить книгу
            <input type="file" accept=".txt" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>
      )}
    </div>
  );
};
