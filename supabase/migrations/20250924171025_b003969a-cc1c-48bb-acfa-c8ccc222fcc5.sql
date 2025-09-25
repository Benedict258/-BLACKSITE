-- Add missing policies for bans table
CREATE POLICY "Bans are viewable by everyone" 
ON public.bans 
FOR SELECT 
USING (true);

-- Add missing policies for reports table
CREATE POLICY "Reports are viewable by everyone" 
ON public.reports 
FOR SELECT 
USING (true);