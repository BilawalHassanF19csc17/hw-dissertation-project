import ProgramRunner from "../components/ProgramRunner";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-4 text-black">
          Concurrent Execution Visualiser (Swimlane)
        </h1>
        <ProgramRunner />
      </div>
    </main>                                                                         
  );
}
