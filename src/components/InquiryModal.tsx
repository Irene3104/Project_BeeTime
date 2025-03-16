import React, { useState, useEffect, useRef } from 'react';
import Logo from '../assets/logo_bee3.png';
import { API_URL } from '../config/constants';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserInfo {
  id?: string;
  name?: string;
  email?: string;
}

// 첨부파일 인터페이스 추가
interface AttachmentFile {
  file: File;
  previewUrl: string;
}

const inquiryTypes = [
  { value: 'system_issue', label: 'System Issue' },
  { value: 'time_record', label: 'Ask for Time Record Modification' },
  { value: 'others', label: 'Others' }
];

// 카테고리 한글 레이블 매핑
const inquiryTypeLabels: Record<string, string> = {
  'system_issue': '시스템 이슈',
  'time_record': '타임 레코드 수정 요청',
  'others': '기타 문의'
};

export const InquiryModal: React.FC<InquiryModalProps> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [inquiryType, setInquiryType] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo>({});
  // 첨부파일 상태 추가
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 컴포넌트 마운트 시 사용자 정보 가져오기
  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_URL}/api/user/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUserInfo({
            id: userData.id,
            name: userData.name,
            email: userData.email
          });
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    }

    if (isOpen) {
      fetchUserInfo();
    }
  }, [isOpen]);

  // 파일 업로드 처리 함수
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: AttachmentFile[] = [];
    
    // 파일 갯수 제한 (최대 3개)
    if (attachments.length + files.length > 3) {
      setError('Maximum 3 files can be attached.');
      return;
    }

    // 파일 크기 제한 (각 파일 5MB 이하)
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.size > 5 * 1024 * 1024) {
        setError('Each file must be 5MB or less.');
        return;
      }
      
      // 미리보기 URL 생성
      const previewUrl = URL.createObjectURL(file);
      newAttachments.push({ file, previewUrl });
    }

    setAttachments([...attachments, ...newAttachments]);
    setError(null);
    
    // 파일 인풋 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 첨부파일 제거 함수
  const removeAttachment = (index: number) => {
    const newAttachments = [...attachments];
    
    // 미리보기 URL 해제
    URL.revokeObjectURL(newAttachments[index].previewUrl);
    
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }
    
    if (!inquiryType) {
      setError('Please select an inquiry type.');
      return;
    }
    
    if (!content.trim()) {
      setError('Please enter your inquiry content.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const submissionTime = new Date().toISOString();
      
      // FormData 객체 생성하여 파일과 데이터 포함
      const formData = new FormData();
      
      // JSON 데이터 추가
      const inquiryData = {
        title,
        type: inquiryType,
        typeLabel: inquiryTypeLabels[inquiryType] || inquiryType,
        content,
        submittedAt: submissionTime,
        user: {
          id: userInfo.id,
          name: userInfo.name || 'Unknown',
          email: userInfo.email || 'No email provided'
        }
      };
      
      formData.append('data', JSON.stringify(inquiryData));
      
      // 첨부 파일 추가
      attachments.forEach((attachment, index) => {
        formData.append('attachments', attachment.file);
      });
      
      const response = await fetch(`${API_URL}/inquiries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit inquiry');
      }
      
      // 폼 초기화
      setTitle('');
      setInquiryType('');
      setContent('');
      
      // 첨부 파일 정리
      attachments.forEach(attachment => {
        URL.revokeObjectURL(attachment.previewUrl);
      });
      setAttachments([]);
      
      // 모달 닫기
      onClose();
      
      // 성공 메시지 표시
      alert('Your inquiry has been submitted successfully!');
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      setError('Failed to submit inquiry. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6 relative border-2 border-blue-400">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        {/* Header */}
        <div className="flex items-center mb-6">
          <img src={Logo} alt="Bee Time Logo" className="h-10 w-10 mr-3" />
          <h2 className="text-xl font-bold">Submit Inquiry</h2>
        </div>
        
        {error && (
          <div className="mb-4 text-sm text-red-500">
            {error}
          </div>
        )}
        
        {/* User Info Display */}
        {userInfo.name && (
          <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600"><strong>User:</strong> {userInfo.name}</p>
            {userInfo.email && <p className="text-sm text-gray-600"><strong>Email:</strong> {userInfo.email}</p>}
          </div>
        )}
        
        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
              Title:
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Enter inquiry title"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="inquiryType">
              Inquiry Type:
            </label>
            <select
              id="inquiryType"
              value={inquiryType}
              onChange={(e) => setInquiryType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              style={{ 
                backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 9l6 6 6-6\"/></svg>')",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.5rem center",
                backgroundSize: "1.5em 1.5em"
              }}
            >
              <option value="" disabled>Select Inquiry Type</option>
              {inquiryTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="content">
              Content:
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Describe your inquiry in detail..."
            />
          </div>
          
          {/* 첨부파일 영역 추가 */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Attachments:
            </label>
            
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg flex items-center text-sm mr-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Choose Files
              </button>
              <span className="text-xs text-gray-500">Max 3 files, 5MB each</span>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              multiple
              accept="image/*, application/pdf, .doc, .docx, .xls, .xlsx"
            />
            
            {/* 첨부파일 미리보기 */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      {/* 파일 아이콘으로 통일 */}
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-gray-500">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      <span className="text-sm truncate max-w-[180px]">{attachment.file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
          >
            {isSubmitting ? 'Submitting...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}; 