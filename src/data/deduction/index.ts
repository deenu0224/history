// 증거·추리 문제·관측·도감 항목. 추리 정답은 반드시 증거의 연대 제약/사실로 도출 가능해야 한다.
import type { ContentModule } from '@/core/types';
import { evidence } from './evidence';
import { deductions } from './deductions';
import { observations } from './observations';
import { collection } from './collection';

export const deduction: ContentModule = { evidence, deductions, observations, collection };
