import { useNavigate } from 'react-router-dom';
import CancelIcon from '../assets/btn_icon_cancel.png';
import HomeIcon from '../assets/home.png';
import UserIcon from '../assets/user.png';
import TimeIcon from '../assets/time.png';
import LogoutIcon from '../assets/logout.png';
import HomeIconHover from '../assets/home_hover.png';
import UserIconHover from '../assets/user_hover.png';
import TimeIconHover from '../assets/time_hover.png';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-full md:w-[375px] bg-[#A77750] shadow-lg z-40">
      {/* 닫기 버튼 */}
      <button 
        className="absolute top-6 right-6 z-50"
        onClick={onClose}
      >
        <img src={CancelIcon} alt="close" className="w-8 h-8" />
      </button>

      {/* 메뉴 컨테이너 - flex-col과 h-full을 사용하여 수직 정렬 제어 */}
      <div className="flex flex-col h-full pt-40 px-0">
        {/* 상단 메뉴 아이템들 */}
        <div className="space-y-5">
          <div 
            className="flex items-center p-8 hover:bg-[#FFE26C] group cursor-pointer px-20"
            onClick={() => navigate('/dashboard')}
          >
            <img src={HomeIcon} alt="home" className="w-6 h-6 mr-4 group-hover:hidden" />
            <img src={HomeIconHover} alt="home" className="w-6 h-6 mr-4 hidden group-hover:block" />
            <span className="text-white group-hover:text-black font-montserrat font-medium text-lg">Home</span>
          </div>
          <div 
            className="flex items-center p-8 hover:bg-[#FFE26C] group cursor-pointer px-20"
            onClick={() => navigate('/account')}
          >
            <img src={UserIcon} alt="account" className="w-6 h-6 mr-4 group-hover:hidden" />
            <img src={UserIconHover} alt="account" className="w-6 h-6 mr-4 hidden group-hover:block" />
            <span className="text-white group-hover:text-black font-montserrat font-medium text-lg">Account</span>
          </div>
          <div 
            className="flex items-center p-8 hover:bg-[#FFE26C] group cursor-pointer px-20"
            onClick={() => navigate('/time-activity')}
          >
            <img src={TimeIcon} alt="time" className="w-6 h-6 mr-4 group-hover:hidden" />
            <img src={TimeIconHover} alt="time" className="w-6 h-6 mr-4 hidden group-hover:block" />
            <span className="text-white group-hover:text-black font-montserrat font-medium text-lg">Time Activity</span>
          </div>
        </div>

        {/* 로그아웃 버튼 - mt-auto로 하단에 고정 */}
        <div 
          className="mt-auto mb-10 flex items-center p-4 cursor-pointer rounded-2xl px-20"
          onClick={handleLogout}
        >
          <img src={LogoutIcon} alt="logout" className="w-6 h-6 mr-4" />
          <span className="text-[#FFE26C] font-montserrat font-medium text-lg">Logout</span>
        </div>
      </div>
    </div>
  );
}; 