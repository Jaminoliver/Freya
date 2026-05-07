export function MassMessageStyles() {
  return (
    <style>{`
      .mm-backdrop {
        position: fixed; inset: 0; z-index: 999;
        background-color: rgba(0,0,0,0.55);
        animation: mmFade 0.18s ease;
      }
      .mm-sheet {
        position: fixed; bottom: 0; left: 0; right: 0; z-index: 1000;
        background-color: #0A0A0F;
        border-top-left-radius: 20px; border-top-right-radius: 20px;
        max-height: 85dvh; display: flex; flex-direction: column;
        animation: mmSlideUp 0.24s cubic-bezier(0.32, 0.72, 0, 1);
        font-family: 'Inter', sans-serif;
      }
      @media (min-width: 768px) {
        .mm-sheet {
          left: 50%; right: auto; transform: translateX(-50%);
          width: 480px; border-radius: 16px;
          bottom: auto; top: 50%; margin-top: -250px;
          max-height: 80vh;
        }
      }
      @keyframes mmFade    { from { opacity: 0; }           to { opacity: 1; } }
      @keyframes mmSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    `}</style>
  );
}