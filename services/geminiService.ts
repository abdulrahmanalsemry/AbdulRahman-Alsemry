
import { GoogleGenAI } from "@google/genai";
import { Quote, Invoice, OperationalExpense, Salesperson } from '../types';

export const getBusinessInsights = async (
  quotes: Quote[],
  invoices: Invoice[],
  expenses: OperationalExpense[],
  team: Salesperson[]
) => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY, });
  
  const approvedQuotes = quotes.filter(q => q.status === 'Approved');
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalCommissions = approvedQuotes.reduce((sum, q) => sum + q.commissionAmount, 0);
  const totalCOGS = approvedQuotes.reduce((sum, q) => sum + q.costOfGoodsSold, 0);
  const totalOpExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  // High-level company net profit
  const companyNetProfit = totalRevenue - (totalCOGS + totalCommissions + totalOpExpenses);

  // Per-salesperson metrics
  const teamMetrics = team.map(t => {
    const tQuotes = approvedQuotes.filter(q => q.salespersonId === t.id);
    const revenue = tQuotes.reduce((sum, q) => sum + q.totalAmount, 0);
    const commissions = tQuotes.reduce((sum, q) => sum + q.commissionAmount, 0);
    const cogs = tQuotes.reduce((sum, q) => sum + q.costOfGoodsSold, 0);
    const netContribution = revenue - (commissions + cogs);
    
    return {
      name: t.name,
      type: t.type,
      revenue,
      commissions,
      netContribution,
      efficiency: revenue > 0 ? (netContribution / revenue) * 100 : 0
    };
  });

  const prompt = `
    Act as a senior business consultant and financial analyst specializing in the Oman market. 
    Analyze the following detailed financial data in Omani Rial (OMR):

    COMPANY FINANCIAL OVERVIEW (All figures in OMR):
    - Total Revenue (Invoiced): OMR ${totalRevenue.toLocaleString()}
    - Total Cost of Goods Sold (COGS): OMR ${totalCOGS.toLocaleString()}
    - Total Sales Commissions (Approved): OMR ${totalCommissions.toLocaleString()}
    - Monthly Operational Expenses (Overhead): OMR ${totalOpExpenses.toLocaleString()}
    - Calculated Overall Company Net Profit: OMR ${companyNetProfit.toLocaleString()}
    - Overall Net Profit Margin: ${totalRevenue > 0 ? ((companyNetProfit / totalRevenue) * 100).toFixed(2) : 0}%

    SALES TEAM PERFORMANCE BREAKDOWN (OMR):
    ${teamMetrics.map(tm => `
    - ${tm.name} (${tm.type}):
      * Gross Revenue Generated: OMR ${tm.revenue.toLocaleString()}
      * Total Commissions Earned: OMR ${tm.commissions.toLocaleString()}
      * Net Contribution to Profit (Sales - COGS - Commissions): OMR ${tm.netContribution.toLocaleString()}
      * Individual Margin Efficiency: ${tm.efficiency.toFixed(2)}%
    `).join('')}

    Provide a professional strategic report (max 400 words) that:
    1. Evaluates the company's financial health within the context of Oman's service sector economy.
    2. Identifies specific top-performing and under-performing sales agents based on their contribution margin.
    3. Provides one actionable recommendation to improve overall profitability (e.g., optimizing COGS, adjusting commission tiers, or scaling overhead).
    
    Format the response using clear Markdown headers and bullet points. Use OMR as the currency symbol throughout.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error fetching insights:", error);
    return "Failed to generate AI insights. The system encountered an error analyzing the financial datasets.";
  }
};
