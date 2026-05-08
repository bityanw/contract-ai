import { useState } from 'react';
import { FileText, X, Sparkles } from 'lucide-react';
import { useAppStore } from '@/store';

const SAMPLE_CONTRACT = `甲方（用人单位）：XX科技有限公司
乙方（劳动者）：张三

根据《中华人民共和国劳动合同法》及相关法律法规，甲乙双方在平等自愿、协商一致的基础上，签订本劳动合同。

一、合同期限
本合同为固定期限劳动合同，自2024年1月1日起至2026年12月31日止。试用期为三个月，自2024年1月1日起至2024年3月31日止。

二、工作内容与工作地点
乙方同意在甲方担任软件工程师岗位，工作地点为北京市海淀区。甲方根据工作需要及乙方能力，经双方协商可变更乙方的工作岗位。

三、劳动报酬
乙方月工资为人民币15000元（税前），于每月15日前支付上月工资。试用期工资为正式工资的80%。

四、工作时间与休息休假
乙方实行标准工时制，每日工作8小时，每周工作40小时，每周休息两天。甲方因生产经营需要，经与乙方协商可延长工作时间，但每日不超过3小时，每月不超过36小时。

五、社会保险与福利
甲方依法为乙方缴纳养老保险、医疗保险、失业保险、工伤保险和生育保险，并缴纳住房公积金。

六、违约责任
任何一方违反本合同约定，应承担违约责任，赔偿对方因此造成的损失。乙方提前解除合同需提前30日书面通知甲方。

七、争议解决
因履行本合同发生的争议，双方应协商解决；协商不成的，可向劳动争议仲裁委员会申请仲裁。`;

const DEFAULT_DIMENSIONS = [
  { id: 'subject', name: '合同主体' },
  { id: 'object', name: '合同标的' },
  { id: 'payment', name: '价款支付' },
  { id: 'breach', name: '违约责任' },
  { id: 'dispute', name: '争议解决' },
  { id: 'term', name: '合同期限' },
];

export { DEFAULT_DIMENSIONS };

export default function ContractInput() {
  const { currentContract, setContract } = useAppStore();
  const [title, setTitle] = useState(currentContract.title);
  const [content, setContent] = useState(currentContract.content);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    setContract(v, content);
  };

  const handleContentChange = (v: string) => {
    setContent(v);
    setContract(title, v);
  };

  const handleClear = () => {
    setTitle('');
    setContent('');
    setContract('', '');
  };

  const handleSample = () => {
    const t = '示例劳动合同';
    setTitle(t);
    setContent(SAMPLE_CONTRACT);
    setContract(t, SAMPLE_CONTRACT);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-200">
          <FileText className="h-5 w-5 text-[#e2b340]" />
          合同输入
        </h2>
        <button
          onClick={handleClear}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-[#2a2a4a] hover:text-gray-200"
        >
          <X className="h-3.5 w-3.5" />
          清空
        </button>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="输入合同标题..."
        className="input-field"
      />

      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="粘贴或输入合同文本..."
          className="input-field resize-none"
          style={{ minHeight: '400px' }}
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {content.length === 0 && (
            <button
              onClick={handleSample}
              className="flex items-center gap-1 rounded-md bg-[#2a2a4a] px-2.5 py-1 text-xs text-[#e2b340] transition-colors hover:bg-[#3a3a5a]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              使用示例合同
            </button>
          )}
          <span className="text-xs text-gray-500">{content.length} 字</span>
        </div>
      </div>
    </div>
  );
}
