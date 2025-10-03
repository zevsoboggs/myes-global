import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Home,
  Building,
  MapPin,
  Key,
  Sparkles,
  Shield,
  Users,
  Clock
} from 'lucide-react';

export function Preloader() {
  const { t, language } = useLanguage();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [showContent, setShowContent] = useState(false);

  const loadingSteps = [
    {
      icon: Building,
      textRu: 'Загружаем недвижимость...',
      textEn: 'Loading properties...',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: MapPin,
      textRu: 'Подготавливаем карты...',
      textEn: 'Preparing maps...',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Shield,
      textRu: 'Проверяем безопасность...',
      textEn: 'Checking security...',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Users,
      textRu: 'Загружаем риелторов...',
      textEn: 'Loading realtors...',
      color: 'from-orange-500 to-yellow-500'
    },
    {
      icon: Key,
      textRu: 'Почти готово...',
      textEn: 'Almost ready...',
      color: 'from-indigo-500 to-purple-500'
    }
  ];

  useEffect(() => {
    const showTimer = setTimeout(() => setShowContent(true), 200);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 8 + 2;
      });
    }, 100);

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % loadingSteps.length);
    }, 1000);

    return () => {
      clearTimeout(showTimer);
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, []);

  const currentStepData = loadingSteps[currentStep];
  const StepIcon = currentStepData.icon;

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0">
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/6 w-32 h-32 lg:w-48 lg:h-48 bg-gradient-to-r from-blue-200/40 to-cyan-200/40 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/6 w-40 h-40 lg:w-56 lg:h-56 bg-gradient-to-r from-purple-200/40 to-pink-200/40 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-r from-green-200/40 to-emerald-200/40 rounded-full blur-2xl animate-bounce" style={{animationDelay: '0.5s'}}></div>

        {/* Geometric shapes */}
        <div className="absolute top-8 left-8 w-4 h-4 bg-blue-300/60 rotate-45 animate-pulse"></div>
        <div className="absolute top-12 right-12 w-3 h-3 bg-purple-300/60 rounded-full animate-bounce"></div>
        <div className="absolute bottom-12 left-12 w-5 h-5 bg-green-300/60 transform rotate-12 animate-pulse" style={{animationDelay: '0.8s'}}></div>
        <div className="absolute bottom-8 right-8 w-2 h-2 bg-orange-300/60 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
      </div>

      {/* Main Content */}
      <div className={`relative h-full flex items-center justify-center transition-all duration-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="text-center max-w-md mx-auto px-6">

          {/* Logo and Brand */}
          <div className="mb-8">
            <div className="relative mb-6">
              {/* Main logo with animated rings */}
              <div className="relative w-20 h-20 lg:w-24 lg:h-24 mx-auto">
                {/* Outer rotating rings */}
                <div className="absolute inset-0 border-2 border-blue-200/60 rounded-full animate-spin-slow"></div>
                <div className="absolute inset-2 border-2 border-purple-300/60 rounded-full animate-spin-reverse-slow"></div>
                <div className="absolute inset-4 border border-green-300/60 rounded-full animate-spin-slow" style={{animationDelay: '0.5s'}}></div>

                {/* Central logo */}
                <div className="absolute inset-6 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-full flex items-center justify-center shadow-xl">
                  <Home className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </div>
              </div>

              {/* Floating particles around logo */}
              <div className="absolute inset-0 w-20 h-20 lg:w-24 lg:h-24 mx-auto">
                <div className="absolute -top-2 left-1/2 w-1 h-1 bg-blue-400 rounded-full animate-ping"></div>
                <div className="absolute top-1/2 -right-2 w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
                <div className="absolute -bottom-2 left-1/2 w-1 h-1 bg-green-400 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                <div className="absolute top-1/2 -left-2 w-1 h-1 bg-orange-400 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
              </div>
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">
              MYES.GLOBAL
            </h1>
            <p className="text-gray-600 text-lg font-medium">
              {language === 'ru' ? 'Глобальная платформа недвижимости' : 'Global Real Estate Platform'}
            </p>
          </div>

          {/* Progress Circle */}
          <div className="relative mb-8">
            <div className="w-32 h-32 lg:w-40 lg:h-40 mx-auto relative">
              {/* Background circle */}
              <div className="absolute inset-0 border-8 border-gray-200/60 rounded-full"></div>

              {/* Progress circle */}
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2.64 * progress} 264`}
                  className="transition-all duration-300 ease-out"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="50%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center content */}
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <div className={`w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-r ${currentStepData.color} rounded-xl flex items-center justify-center mb-2 shadow-lg animate-pulse`}>
                  <StepIcon className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
                </div>
                <div className="text-2xl lg:text-3xl font-bold text-gray-800">
                  {Math.round(Math.min(progress, 100))}%
                </div>
              </div>
            </div>
          </div>

          {/* Loading Text */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
              <p className="text-gray-700 text-lg font-medium animate-fade-in">
                {language === 'ru' ? currentStepData.textRu : currentStepData.textEn}
              </p>
              <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" style={{animationDelay: '0.5s'}} />
            </div>

            {/* Loading dots */}
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>

          {/* Feature Icons */}
          <div className="flex justify-center space-x-6 mb-6">
            {[
              { icon: Shield, label: language === 'ru' ? 'Безопасно' : 'Secure', color: 'text-green-600' },
              { icon: Clock, label: language === 'ru' ? 'Быстро' : 'Fast', color: 'text-blue-600' },
              { icon: Users, label: language === 'ru' ? 'Надежно' : 'Reliable', color: 'text-purple-600' }
            ].map((feature, index) => (
              <div key={index} className="text-center animate-bounce" style={{animationDelay: `${index * 0.2}s`}}>
                <div className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-2 shadow-md border border-gray-200/60">
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <span className="text-gray-600 text-xs font-medium">{feature.label}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-gray-500 text-sm font-medium">
              {language === 'ru' ? 'Загружаем лучшие предложения для вас...' : 'Loading the best offers for you...'}
            </p>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(1deg); }
          66% { transform: translateY(-10px) rotate(-1deg); }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spin-reverse-slow {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }

        .animate-spin-reverse-slow {
          animation: spin-reverse-slow 3s linear infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}