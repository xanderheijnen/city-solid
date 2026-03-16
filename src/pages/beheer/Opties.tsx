import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CATEGORIEEN = ['Wijk', 'Gebied', 'Uitkering', 'Klantmanager'];

export default function Opties() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Opties Beheer</h1>
      <Tabs defaultValue="wijk">
        <TabsList>
          {CATEGORIEEN.map((cat) => (
            <TabsTrigger key={cat} value={cat.toLowerCase()}>{cat}</TabsTrigger>
          ))}
        </TabsList>
        {CATEGORIEEN.map((cat) => (
          <TabsContent key={cat} value={cat.toLowerCase()}>
            <Card>
              <CardHeader>
                <CardTitle>{cat} opties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
                  Beheer {cat.toLowerCase()} waarden
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
