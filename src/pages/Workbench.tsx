import { useEffect } from 'react';
import { useAppStore } from '@/store';
import ContractInput from '@/components/ContractInput';
import ReviewConfig from '@/components/ReviewConfig';
import ReviewResults from '@/components/ReviewResults';

export default function Workbench() {
  const fetchTemplates = useAppStore((s) => s.fetchTemplates);
  const currentReview = useAppStore((s) => s.currentReview);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return (
    <div className="min-h-screen bg-[#1a1a2e] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-100">审核工作台</h1>
          <p className="mt-1 text-sm text-gray-500">上传合同文本，配置审核参数，启动智能审核</p>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="lg:w-[60%]">
            <ContractInput />
          </div>
          <div className="lg:w-[40%]">
            <ReviewConfig />
          </div>
        </div>

        {currentReview && (
          <div className="mt-8">
            <ReviewResults />
          </div>
        )}
      </div>
    </div>
  );
}
