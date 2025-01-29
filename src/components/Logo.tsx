import beeLogo from '../assets/logo_bee1.png';

interface LogoProps {
  className?: string;
}

export const Logo = ({ className }: LogoProps) => {
  return (
    <div className="flex items-center justify-center">
      <img 
        src={beeLogo}
        alt="Bee Logo" 
        className={`mx-auto h-24 w-auto ${className || ''}`}
      />
    </div>
  );
};